"""Translate public CMS copy into a local cache; never writes to Supabase or publishes.
Uses Google Translate's public machine translation endpoint. All results retain
machine provenance; Haitian Creole is excluded. Run the JS validator afterwards.
"""
import concurrent.futures, json, pathlib, re, sys, time, urllib.parse, urllib.request
requests_file, cache_file = map(pathlib.Path, sys.argv[1:3])
requests = json.loads(requests_file.read_text())
cache = json.loads(cache_file.read_text()) if cache_file.exists() else {}
locales = {'fr':'fr', 'es':'es', 'zh-Hans':'zh-CN'}

def batch_translate(rows, locale):
    protected = {}
    def protect(text):
        def sub(match):
            token = 'ZXQPH%04dZXQ' % len(protected)
            protected[token] = match.group(0)
            return token
        return re.sub(r'\{[a-zA-Z][a-zA-Z0-9_]*\}|\bWantiss\b|\bGoodies\b|\bMonCash\b|\bStripe\b|\bGeoapify\b|\bVisa\b|\bMastercard\b|\bAmex\b|https?://[^\s]+', sub, text.strip())
    body = '\n'.join('⟦%s⟧ %s' % (row['id'], protect(row['text'])) for row in rows)
    params = urllib.parse.urlencode({'client':'gtx', 'sl':'en', 'tl':locales[locale], 'dt':'t', 'q':body})
    with urllib.request.urlopen('https://translate.googleapis.com/translate_a/single?'+params, timeout=35) as response:
        data = json.load(response)
    text = ''.join(part[0] for part in data[0] if part[0])
    parts = re.split(r'⟦\s*(K\d{4})\s*⟧', text)
    translated = {parts[i]:parts[i+1].strip() for i in range(1,len(parts),2)}
    if set(translated) != {row['id'] for row in rows}:
        raise ValueError('Translation field boundaries changed')
    out = []
    for row in rows:
        value = translated[row['id']]
        for token, original in protected.items():
            value = value.replace(token, original)
        if 'ZXQPH' in value or not value:
            raise ValueError('Protected translation token changed')
        if sorted(re.findall(r'\{[a-zA-Z][a-zA-Z0-9_]*\}', value)) != sorted(re.findall(r'\{[a-zA-Z][a-zA-Z0-9_]*\}',row['text'])):
            raise ValueError('Dynamic placeholder changed')
        # Fragments remain safe to concatenate with names, prices and quantities.
        value = re.match(r'^\s*',row['text']).group(0)+value.strip()+re.search(r'\s*$',row['text']).group(0)
        out.append((row['text'],locale,value))
    return out

jobs = []
for locale in locales:
    batch=[];size=0
    for row in requests:
        if cache.get(row['text'],{}).get(locale): continue
        if batch and (len(batch)>=35 or size+len(row['text'])>1800):
            jobs.append((batch,locale));batch=[];size=0
        batch.append(row);size+=len(row['text'])+16
    if batch: jobs.append((batch,locale))
print('Machine translation batches:',len(jobs),flush=True)
failures=[]
def run(job):
    for attempt in range(2):
        try:return batch_translate(*job)
        except Exception:
            if attempt==0:time.sleep(2)
    # Retry a failed batch once as individual fields; do not silently guess.
    result=[]
    for row in job[0]:
        result.extend(batch_translate([row],job[1]))
    return result
with concurrent.futures.ThreadPoolExecutor(max_workers=3) as pool:
    futures={pool.submit(run,job):job for job in jobs}
    for number,future in enumerate(concurrent.futures.as_completed(futures),1):
        try:
            for source,locale,value in future.result():cache.setdefault(source,{})[locale]=value
            cache_file.write_text(json.dumps(cache,ensure_ascii=False,indent=2)+'\n')
        except Exception as error:
            failures.append({'locale':futures[future][1],'ids':[row['id'] for row in futures[future][0]],'error':type(error).__name__})
        if number%10==0 or number==len(jobs):print('Completed %d/%d batches; %d failures'%(number,len(jobs),len(failures)),flush=True)
if failures:
    cache_file.with_suffix('.failures.json').write_text(json.dumps(failures,indent=2)+'\n')
    raise SystemExit('Translation errors require inspection; nothing was published.')
