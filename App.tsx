import React, { useRef, useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  ScrollView,
  Image,
  StyleSheet,
  Keyboard,
  TouchableWithoutFeedback,
  useWindowDimensions,
  NativeSyntheticEvent,
  NativeScrollEvent,
  KeyboardTypeOptions,
  Animated,
  Easing,
  PanResponder,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialCommunityIcons } from '@expo/vector-icons';

const PINK = '#BF008E';
const TOGGLE_BG = '#E0E3E7';
const TOGGLE_TEXT_OFF = '#949090';
const FIELD_BG = '#FBE8EF';
const FIELD_TEXT = '#9A4B68';
const LINK = '#9D315B';
const DARK = '#14181B';
const PAGE_BG = '#F1F4F8';
const RED = '#FF0000';

const LOGO_URL =
  'https://raw.githubusercontent.com/momojdy/tiss_icons_assets/refs/heads/main/WantisslogoOuterless.PNG';

const GOOGLE_PNG =
  'https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.png';

type AuthCardProps = {
  onSignInPressed?: (email: string, password: string) => Promise<unknown>;
  onSignUpPressed?: (
    email: string,
    password: string,
    role: string,
    fullName: string,
    businessName: string,
  ) => Promise<unknown>;
  onGooglePressed?: () => Promise<unknown>;
  onApplePressed?: () => Promise<unknown>;
};

type IconName = React.ComponentProps<typeof MaterialCommunityIcons>['name'];

type AuthFieldProps = {
  top: number;
  value: string;
  onChangeText: (t: string) => void;
  placeholder: string;
  icon: IconName;
  error?: string | null;
  keyboardType?: KeyboardTypeOptions;
  autoCapitalize?: 'none' | 'words';
  secureTextEntry?: boolean;
  suffix?: React.ReactNode;
};

function AuthField({
  top, value, onChangeText, placeholder, icon, error,
  keyboardType, autoCapitalize, secureTextEntry, suffix,
}: AuthFieldProps) {
  return (
    <View style={{ paddingTop: top, paddingBottom: 8, paddingHorizontal: 8 }}>
      <View style={[styles.fieldBox, error ? { borderWidth: 1, borderColor: RED } : null]}>
        <View style={styles.fieldInner}>
          <View style={styles.prefixIcon}>
            <MaterialCommunityIcons name={icon} size={24} color={FIELD_TEXT} />
          </View>
          <TextInput
            value={value}
            onChangeText={onChangeText}
            placeholder={placeholder}
            placeholderTextColor={FIELD_TEXT}
            keyboardType={keyboardType}
            autoCapitalize={autoCapitalize ?? 'none'}
            autoCorrect={false}
            secureTextEntry={secureTextEntry}
            style={styles.textInput}
          />
          {suffix}
        </View>
      </View>
      {error ? <Text style={[styles.fieldError, { marginTop: 5 }]}>{error}</Text> : null}
    </View>
  );
}

function WantissAuthCard({
  onSignInPressed, onSignUpPressed, onGooglePressed, onApplePressed,
}: AuthCardProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [businessName, setBusinessName] = useState('');
  const [isVendor, setIsVendor] = useState(false);
  const [isRegisterMode, setIsRegisterMode] = useState(false);
  const [obscurePassword, setObscurePassword] = useState(true);
  const [registerStep, setRegisterStep] = useState(0);
  const [emailError, setEmailError] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [fullNameError, setFullNameError] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [googleFailed, setGoogleFailed] = useState(false);

  const pagerRef = useRef<ScrollView>(null);
  const { width: screenWidth } = useWindowDimensions();
  const pageWidth = Math.max(0, screenWidth - 60);
  const isValidEmail = (value: string) => /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(value);

  const clearErrors = () => {
    setEmailError(null); setPasswordError(null); setFullNameError(null); setErrorMessage(null);
  };

  const toggleRegisterMode = () => {
    setIsRegisterMode(v => !v); setRegisterStep(0); clearErrors();
    pagerRef.current?.scrollTo({ x: 0, y: 0, animated: false });
  };

  const toggleRole = () => {
    setIsVendor(v => !v); setRegisterStep(0); clearErrors();
    pagerRef.current?.scrollTo({ x: 0, y: 0, animated: false });
  };

  const goToRegisterStep = (step: number) => {
    setRegisterStep(step); clearErrors();
    pagerRef.current?.scrollTo({ x: step * pageWidth, y: 0, animated: true });
  };

  const onPagerScrollEnd = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const index = Math.round(e.nativeEvent.contentOffset.x / pageWidth);
    if (index !== registerStep) { setRegisterStep(index); clearErrors(); }
  };

  const handleRegisterNext = () => {
    if (!fullName.trim()) { setFullNameError('Full Name is required.'); return; }
    setFullNameError(null); setErrorMessage(null); goToRegisterStep(1);
  };

  const handleSubmit = async () => {
    clearErrors();
    if (isRegisterMode && isVendor && registerStep === 0) { handleRegisterNext(); return; }

    const trimmedEmail = email.trim();
    let hasError = false;
    if (!trimmedEmail || !isValidEmail(trimmedEmail)) { setEmailError('Enter a valid email address.'); hasError = true; }
    if (!password) { setPasswordError('Password is required.'); hasError = true; }
    if (hasError) return;

    if (!isRegisterMode) {
      if (!onSignInPressed) return;
      try { await onSignInPressed(trimmedEmail, password); }
      catch { setErrorMessage('Unable to sign in. Please try again.'); }
      return;
    }

    if (!isVendor) {
      if (!onSignUpPressed) return;
      try { await onSignUpPressed(trimmedEmail, password, 'buyer', '', ''); }
      catch { setErrorMessage('Unable to create your account. Please try again.'); }
      return;
    }

    if (!onSignUpPressed) return;
    try {
      await onSignUpPressed(trimmedEmail, password, 'business', fullName.trim(), businessName.trim());
    } catch { setErrorMessage('Unable to create your account. Please try again.'); }
  };

  const renderToggle = () => (
    <View style={styles.toggleRow}><View style={styles.toggleOuter}><View style={styles.toggleInner}>
      <Pressable style={[styles.toggleHalf, !isVendor && { backgroundColor: PINK }]} onPress={() => isVendor && toggleRole()}>
        <Text style={[styles.toggleText, { color: !isVendor ? '#FFFFFF' : TOGGLE_TEXT_OFF }]}>Buyer</Text>
      </Pressable>
      <Pressable style={[styles.toggleHalf, isVendor && { backgroundColor: PINK }]} onPress={() => !isVendor && toggleRole()}>
        <Text style={[styles.toggleText, { color: isVendor ? '#FFFFFF' : TOGGLE_TEXT_OFF }]}>B&P 2P</Text>
      </Pressable>
    </View></View></View>
  );

  const renderBusinessSpaceLabel = () => isVendor ? (
    <View style={styles.businessLabelBox}><Text style={styles.businessLabelText}>Business Space</Text></View>
  ) : null;

  const renderRegisterStepIndicator = () => (
    <View style={styles.stepIndicator}>
      <View style={[styles.stepDot, { backgroundColor: registerStep === 0 ? PINK : TOGGLE_BG }]} />
      <View style={{ width: 7 }} />
      <View style={[styles.stepDot, { backgroundColor: registerStep === 1 ? PINK : TOGGLE_BG }]} />
    </View>
  );

  const renderEmailField = () => <AuthField top={15} value={email} onChangeText={t => { setEmail(t); if (emailError) setEmailError(null); }} placeholder="Email" icon="email-outline" error={emailError} keyboardType="email-address" />;
  const renderPasswordField = () => <AuthField top={12} value={password} onChangeText={t => { setPassword(t); if (passwordError) setPasswordError(null); }} placeholder="Password" icon="lock-outline" error={passwordError} secureTextEntry={obscurePassword} suffix={<Pressable style={styles.suffixButton} onPress={() => setObscurePassword(v => !v)}><MaterialCommunityIcons name={obscurePassword ? 'eye-off-outline' : 'eye-outline'} size={24} color={FIELD_TEXT} /></Pressable>} />;
  const renderFullNameField = () => <AuthField top={15} value={fullName} onChangeText={t => { setFullName(t); if (fullNameError) setFullNameError(null); }} placeholder="Full Name" icon="account-outline" error={fullNameError} autoCapitalize="words" />;
  const renderBusinessNameField = () => <AuthField top={12} value={businessName} onChangeText={setBusinessName} placeholder="Business Name (optional)" icon="office-building-outline" autoCapitalize="words" />;

  const renderForgotPassword = () => (
    <View style={styles.forgotRow}><Pressable onPress={() => {
      const trimmed = email.trim();
      if (!trimmed || !isValidEmail(trimmed)) setErrorMessage('Enter a valid email address first.');
    }}><Text style={styles.forgotText}>Forgot password?</Text></Pressable></View>
  );

  const renderSubmitButton = (text: string) => (
    <View style={styles.submitWrap}><Pressable style={styles.submitButton} onPress={handleSubmit}>
      <View style={styles.submitContent}><Text style={styles.submitText}>{text}</Text>
      {text === 'Next' ? <MaterialCommunityIcons name="arrow-right" size={22} color="#FFFFFF" /> : null}</View>
    </Pressable></View>
  );

  const renderSocialButtons = () => (
    <View style={styles.socialRow}>
      <Pressable style={styles.socialButton} onPress={() => onGooglePressed?.()}>
        {googleFailed ? <Text style={styles.googleFallback}>G</Text> : <Image source={{ uri: GOOGLE_PNG }} style={{ width: 22, height: 22 }} onError={() => setGoogleFailed(true)} />}
      </Pressable>
      <View style={{ width: 90 }} />
      <Pressable style={styles.socialButton} onPress={() => onApplePressed?.()}><MaterialCommunityIcons name="apple" size={25} color="#000000" /></Pressable>
    </View>
  );

  const renderCredentialsBlock = (submitText: string) => <View>{renderEmailField()}{renderPasswordField()}{renderForgotPassword()}{renderSocialButtons()}{renderSubmitButton(submitText)}</View>;

  const renderBusinessRegistrationPages = () => (
    <View style={{ width: '100%', height: 365, overflow: 'hidden' }}>
      <ScrollView ref={pagerRef} horizontal pagingEnabled bounces={false} showsHorizontalScrollIndicator={false} keyboardShouldPersistTaps="handled" onMomentumScrollEnd={onPagerScrollEnd} style={{ width: '100%', height: 365 }}>
        <View style={{ width: pageWidth, height: 365 }}>{renderFullNameField()}{renderBusinessNameField()}{renderSubmitButton('Next')}</View>
        <View style={{ width: pageWidth, height: 365 }}>{renderCredentialsBlock('Sign Up')}</View>
      </ScrollView>
    </View>
  );

  return (
    <View style={{ width: '100%' }}>
      <View style={styles.card}>
        <ScrollView bounces={false} overScrollMode="never" showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
          {renderToggle()}{renderBusinessSpaceLabel()}
          {isRegisterMode && isVendor ? renderRegisterStepIndicator() : null}
          {isRegisterMode && isVendor ? renderBusinessRegistrationPages() : isRegisterMode ? renderCredentialsBlock('Sign Up') : renderCredentialsBlock('Sign in')}
          {errorMessage ? <View style={styles.errorMessageWrap}><Text style={styles.fieldError}>{errorMessage}</Text></View> : null}
        </ScrollView>
      </View>
      <Pressable style={styles.bottomSwitch} onPress={toggleRegisterMode}>
        <Text style={styles.bottomSwitchText}>{isRegisterMode ? 'Already have an account? ' : "Don't have an account? "}<Text style={styles.bottomSwitchLink}>{isRegisterMode ? 'Sign in' : 'Register'}</Text></Text>
      </Pressable>
    </View>
  );
}

const TAB_DATA = ['Favs', 'For you', 'Flash', 'Locals', 'New Arrivals', 'Live', 'Categories...'];
const CATEGORY_IMAGES: Record<string, string> = {
  Goodies: 'https://raw.githubusercontent.com/momojdy/tiss_icons_assets/refs/heads/main/Goodies.PNG',
  Woulib: 'https://raw.githubusercontent.com/momojdy/tiss_icons_assets/refs/heads/main/Woulib.PNG',
  Services: 'https://raw.githubusercontent.com/momojdy/tiss_icons_assets/refs/heads/main/Services.PNG',
  Globiz: 'https://raw.githubusercontent.com/momojdy/tiss_icons_assets/refs/heads/main/Globiz.PNG',
  Konsoliss: 'https://raw.githubusercontent.com/momojdy/tiss_icons_assets/refs/heads/main/Konsoliss.PNG',
  Stays: 'https://raw.githubusercontent.com/momojdy/tiss_icons_assets/refs/heads/main/stays.PNG',
  Flyz: 'https://raw.githubusercontent.com/momojdy/tiss_icons_assets/refs/heads/main/Flyz.PNG',
  Habita: 'https://raw.githubusercontent.com/momojdy/tiss_icons_assets/refs/heads/main/Habita.PNG',
  Rideza: 'https://raw.githubusercontent.com/momojdy/tiss_icons_assets/refs/heads/main/Rideza%20.PNG',
  Frenzies: 'https://raw.githubusercontent.com/momojdy/tiss_icons_assets/refs/heads/main/Frenzies.PNG',
  'Arts & Lits': 'https://raw.githubusercontent.com/momojdy/tiss_icons_assets/refs/heads/main/Arts_lits.PNG',
  Streamz: 'https://raw.githubusercontent.com/momojdy/tiss_icons_assets/refs/heads/main/Streamz.PNG',
  Gatherz: 'https://raw.githubusercontent.com/momojdy/tiss_icons_assets/refs/heads/main/Gatherz.PNG',
  Glowz: 'https://raw.githubusercontent.com/momojdy/tiss_icons_assets/refs/heads/main/Glowz.PNG',
  Prezo: 'https://raw.githubusercontent.com/momojdy/tiss_icons_assets/refs/heads/main/Prezo%20.PNG',
  'Top Up': 'https://raw.githubusercontent.com/momojdy/tiss_icons_assets/refs/heads/main/Topup.PNG',
  Deals: 'https://raw.githubusercontent.com/momojdy/tiss_icons_assets/refs/heads/main/Deals.PNG',
  Bidz: 'https://raw.githubusercontent.com/momojdy/tiss_icons_assets/refs/heads/main/Bidz.PNG',
  Lutz: 'https://raw.githubusercontent.com/momojdy/tiss_icons_assets/refs/heads/main/Lutz.PNG',
  More: 'https://raw.githubusercontent.com/momojdy/tiss_icons_assets/refs/heads/main/More.PNG',
};

const CATEGORY_ICONS: Record<string, IconName> = {
  Goodies: 'gift-outline', Woulib: 'shopping-bag-outline', Services: 'tools',
  Globiz: 'web', Konsoliss: 'account-group-outline', Stays: 'home-outline',
  Flyz: 'airplane', Habita: 'office-building-outline', Rideza: 'car-outline',
  Frenzies: 'account-group-outline', 'Arts & Lits': 'palette-outline',
  Streamz: 'play-circle-outline', Gatherz: 'calendar-heart', Glowz: 'lightbulb-on-outline',
  Prezo: 'gift-outline', 'Top Up': 'wallet-plus-outline', Deals: 'tag-outline',
  Bidz: 'gavel', Lutz: 'basket-outline', More: 'dots-horizontal',
};

const EXPANDED = ['Stays','Flyz','Habita','Rideza','Frenzies','Arts & Lits','Streamz','Gatherz','Glowz','Prezo','Top Up','Deals','Bidz','Lutz','More'];
const COLLAPSED = ['Goodies','Woulib','Services','Globiz','Konsoliss'];

function CategoryItem({ label, width }: { label: string; width: number }) {
  return <View style={{ width, height: 78, alignItems: 'center' }}>
    <View style={styles.categoryCircle}>
      <Image source={{ uri: CATEGORY_IMAGES[label] }} style={styles.categoryImage} resizeMode="cover" />
    </View>
    <Text numberOfLines={1} style={styles.categoryLabel}>{label}</Text>
  </View>;
}

function MainDragCarouselRN() {
  const { width } = useWindowDimensions();
  const [expanded, setExpanded] = useState(false);
  const progress = useRef(new Animated.Value(0)).current;
  const teaserOpacity = progress.interpolate({ inputRange:[0,0.55,1], outputRange:[1,0,0], extrapolate:'clamp' });
  const height = progress.interpolate({ inputRange:[0,1], outputRange:[158,234] });

  const animateTo = (to: number) => {
    setExpanded(to === 1);
    Animated.timing(progress, { toValue:to, duration:450, easing:Easing.out(Easing.cubic), useNativeDriver:false }).start();
  };

  const panResponder = useRef(PanResponder.create({
    onMoveShouldSetPanResponder: (_, g) => Math.abs(g.dx) > Math.abs(g.dy) && Math.abs(g.dx) > 5,
    onPanResponderRelease: (_, g) => {
      if (g.vx < -0.2 || g.dx < -40) animateTo(1);
      else if (g.vx > 0.2 || g.dx > 40) animateTo(0);
    },
  })).current;

  const teaser = (
    <Animated.View pointerEvents={expanded ? 'none' : 'auto'} style={[styles.teaserArea, { opacity: teaserOpacity }]}>
      <View style={styles.teaserCard}>
        <View style={styles.teaserTitleRow}><MaterialCommunityIcons name="auto-fix" size={14} color={DARK}/><Text style={styles.teaserTitle}>featured picks</Text></View>
        <View style={styles.teaserInner}><View style={styles.featuredInner}/></View><Text style={styles.teaserCaption}>from $9</Text>
      </View>
      <View style={styles.teaserCard}>
        <View style={styles.teaserTitleRow}><MaterialCommunityIcons name="clock-time-four" size={14} color={DARK}/><Text style={styles.teaserTitle}>flash deals</Text></View>
        <View style={styles.teaserInner}><View style={styles.flashInner}/></View><Text style={styles.teaserCaption}>up to $10 off</Text>
      </View>
    </Animated.View>
  );

  const renderCollapsed = () => COLLAPSED.map((label, i) => (
    <View key={label} style={[styles.absoluteCategory, { left:i*(width/5.59), top:0, opacity: progress.interpolate({inputRange:[0,1],outputRange:[1,0],extrapolate:'clamp'}) }]}>
      <CategoryItem label={label} width={width/5} />
    </View>
  ));

  const renderExpanded = () => EXPANDED.map((label, index) => {
    const row = Math.floor(index/5);
    const col = index%5;
    const targetX = col*(width/5);
    const targetY = row*78;
    const startX = ((index-1)%5)*(width/5.59);
    const x = progress.interpolate({inputRange:[0,1],outputRange:[startX,targetX]});
    const y = progress.interpolate({inputRange:[0,1],outputRange:[0,targetY]});
    return <Animated.View key={label} style={[styles.absoluteCategory,{left:0,top:0,transform:[{translateX:x},{translateY:y}],opacity:progress.interpolate({inputRange:[0,0.15,1],outputRange:[0,1,1],extrapolate:'clamp'})}]}><CategoryItem label={label} width={width/5}/></Animated.View>;
  });

  const staysX = progress.interpolate({inputRange:[0,1],outputRange:[5*(width/5.59),0]});
  return (
    <Animated.View style={[styles.dragContainer,{height}]} {...panResponder.panHandlers}>
      {teaser}
      {renderCollapsed()}
      <Animated.View style={[styles.absoluteCategory,{left:0,top:0,transform:[{translateX:staysX}]}]}><CategoryItem label="Stays" width={width/5}/></Animated.View>
      {renderExpanded()}
      <Animated.View pointerEvents="none" style={[styles.swipeIndicator,{top:progress.interpolate({inputRange:[0,1],outputRange:[78,210]}) ,opacity:progress.interpolate({inputRange:[0,.75,1],outputRange:[1,.25,1]})}]}>
        <View style={[styles.indicatorLine,{backgroundColor:progress.interpolate({inputRange:[0,1],outputRange:[PINK,'#D6D6D6']})}]} />
        <View style={[styles.indicatorDot,{backgroundColor:progress.interpolate({inputRange:[0,1],outputRange:['#D6D6D6',PINK]})}]} />
      </Animated.View>
    </Animated.View>
  );
}

function MainTabSelectorRN() {
  const [selected, setSelected] = useState('For you');
  return <View style={styles.tabBar}>
    <MaterialCommunityIcons name="map-marker" size={26} color={PINK} style={{marginLeft:12,marginBottom:15,marginRight:8}} />
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{alignItems:'flex-end'}}>
      {TAB_DATA.map(tab => <Pressable key={tab} onPress={()=>setSelected(tab)} style={[styles.tab,{width:tab==='New Arrivals'?80:tab==='Categories...' ? 95 : tab==='For you'?65:tab==='Flash'?70:tab==='Locals'?60:tab==='Live'?70:60,backgroundColor:selected===tab?'#FFFFFF':'transparent'}]}>
        {tab==='Flash' ? <MaterialCommunityIcons name="flash" size={14} color={PINK} style={{marginRight:2}}/> : null}
        <Text style={styles.tabText}>{tab==='New Arrivals' ? 'New\nArrivals' : tab==='Live' ? 'Live' : tab}</Text>
        {tab==='Live' ? <View style={styles.liveBadge}><MaterialCommunityIcons name="play" size={9} color="#FFFFFF"/></View> : null}
      </Pressable>)}
    </ScrollView>
  </View>;
}

function SearchBarRN() {
  const [index, setIndex] = useState(1);
  const phrases = ['Buy Happiness','Wantiss','Sell Joy'];
  useEffect(() => {
    const timer = setInterval(() => setIndex(v => (v+1)%phrases.length), 3800);
    return () => clearInterval(timer);
  }, []);
  return <View style={styles.searchBar}>
    <MaterialCommunityIcons name="center-focus-weak" size={30} color={PINK} />
    <View style={styles.searchDivider}/>
    <View style={styles.sloganViewport}>
      <AnimatedSlogan index={index} phrases={phrases}/>
    </View>
    <MaterialCommunityIcons name="camera-outline" size={25} color="#777777" />
    <Pressable style={styles.searchButton}><Text style={styles.searchButtonText}>search</Text></Pressable>
  </View>;
}

function AnimatedSlogan({index,phrases}:{index:number;phrases:string[]}) {
  const [display, setDisplay] = useState(index);
  const translate = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (display === index) return;
    translate.setValue(0);
    Animated.timing(translate,{toValue:-32,duration:800,easing:Easing.linear,useNativeDriver:true}).start(({finished})=>{
      if(finished) { setDisplay(index); translate.setValue(32); Animated.timing(translate,{toValue:0,duration:0,useNativeDriver:true}).start(); }
    });
  },[index]);
  return <View style={{alignItems:'center',justifyContent:'center',height:100,overflow:'hidden'}}>
    <Animated.Text style={[styles.sloganText,{transform:[{translateY:translate}]}]}>{phrases[display]}</Animated.Text>
  </View>;
}

function PromoBannerRN() {
  const messages=['new season styles, up to 20% off','free shipping on orders over $50','limited time: buy 1 get 1 half off'];
  const [message,setMessage]=useState(0);
  useEffect(()=>{const t=setInterval(()=>setMessage(v=>(v+1)%messages.length),3000);return()=>clearInterval(t)},[]);
  return <View style={styles.promoBanner}>
    <View style={styles.promoCards}>
      <View style={styles.voucherCard}><Text style={styles.voucherText}>$7 grocery voucher</Text></View>
      {['$51.9 off','$10.5 off','$43.9 off'].map((x,i)=><View key={x} style={styles.promoImageCard}><View style={styles.promoColor}/><Text style={styles.promoCaption}>{x}</Text></View>)}
    </View>
    <View style={styles.notificationStrip}><MaterialCommunityIcons name="volume-high" size={15} color="#FFFFFF"/><Text style={styles.notificationText}>{messages[message]}</Text></View>
  </View>;
}

function PromoPopupRN() {
  const [visible,setVisible]=useState(true);
  const [message,setMessage]=useState(0);
  const messages=['spend $80, save $10 — claim now','free delivery on your next order','new members get 15% off today'];
  useEffect(()=>{const t=setInterval(()=>setMessage(v=>(v+1)%messages.length),3000);return()=>clearInterval(t)},[]);
  if(!visible)return null;
  return <View style={styles.popup}><View style={styles.popupBadge}><Text style={styles.popupBadgeText}>PROMO</Text></View><Text style={styles.popupText}>{messages[message]}</Text><Pressable onPress={()=>setVisible(false)}><MaterialCommunityIcons name="close" size={18} color="#A789B1"/></Pressable></View>;
}

function BottomNavRN() {
  return <View style={styles.bottomNav}>
    <Pressable style={styles.navItem}><View style={styles.navLogoCircle}><Image source={{uri:LOGO_URL}} style={styles.navLogo}/></View></Pressable>
    <Pressable style={styles.navItem}><MaterialCommunityIcons name="television-play" size={32} color={PINK}/><Text style={styles.navLabel}>Showcase</Text></Pressable>
    <Pressable style={styles.navItem}><MaterialCommunityIcons name="message-outline" size={30} color={PINK}/><Text style={styles.navLabel}>Messages</Text></Pressable>
    <Pressable style={styles.navItem}><MaterialCommunityIcons name="cart-check" size={32} color={PINK}/><Text style={styles.navLabel}>Cart</Text></Pressable>
    <Pressable style={styles.navItem}><MaterialCommunityIcons name="emoticon-happy-outline" size={32} color={PINK}/><Text style={styles.navLabel}>Me</Text></Pressable>
  </View>;
}

function HomePage() {
  return <View style={styles.homePage}>
    <StatusBar style="dark" />
    <MainTabSelectorRN />
    <SearchBarRN />
    <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.homeScrollContent}>
      <MainDragCarouselRN />
      <PromoBannerRN />
      <View style={styles.placeholderGrid}>{[0,1,2,3,4].map(i=><View key={i} style={styles.placeholderTile}/>)}</View>
      <View style={{height:100}} />
    </ScrollView>
    <BottomNavRN />
    <View style={styles.popupPosition}><PromoPopupRN /></View>
  </View>;
}

export default function App() {
  const [authenticated, setAuthenticated] = useState(false);
  const { height: screenHeight } = useWindowDimensions();
  const headerTop = ((screenHeight - 356) / 2) * (-1.03 + 1);

  if (authenticated) return <HomePage />;

  return <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
    <View style={styles.page}>
      <StatusBar style="dark" />
      <LinearGradient colors={['#F7DDEB','#FBEAF3','#FFF5E9']} locations={[0,0.85,0.925]} start={{x:1,y:1}} end={{x:0,y:0}} style={[styles.header,{top:headerTop}]}>
        <View style={styles.logoBox}><Image source={{uri:LOGO_URL}} style={styles.logo} resizeMode="contain"/></View>
      </LinearGradient>
      <View style={styles.cardPosition}>
        <WantissAuthCard
          onSignInPressed={async () => setAuthenticated(true)}
          onSignUpPressed={async (_email,_password,role) => { if(role==='buyer') setAuthenticated(true); }}
          onGooglePressed={async () => { console.log('Google OAuth not connected yet'); }}
          onApplePressed={async () => { console.log('Apple OAuth not connected yet'); }}
        />
      </View>
    </View>
  </TouchableWithoutFeedback>;
}

const styles = StyleSheet.create({
  page:{flex:1,backgroundColor:PAGE_BG},
  header:{position:'absolute',left:0,right:0,height:356},
  logoBox:{flex:1,paddingLeft:10,paddingTop:50,paddingRight:30,paddingBottom:25},
  logo:{width:'100%',height:'100%',borderRadius:8},
  cardPosition:{position:'absolute',top:300,left:15,right:15},
  card:{width:'100%',height:470,backgroundColor:'#FFFFFF',borderRadius:20,paddingLeft:15,paddingRight:15,paddingTop:24,overflow:'hidden'},
  toggleRow:{width:'100%',paddingLeft:8,paddingRight:8},toggleOuter:{width:'100%',height:50},
  toggleInner:{flex:1,flexDirection:'row',backgroundColor:TOGGLE_BG,borderWidth:1,borderColor:TOGGLE_BG,borderRadius:12,padding:2},
  toggleHalf:{flex:1,height:44,borderRadius:10,alignItems:'center',justifyContent:'center'},
  toggleText:{fontSize:16,fontWeight:'600'},
  businessLabelBox:{height:25,justifyContent:'center',alignItems:'center',paddingLeft:'50%'},businessLabelText:{fontSize:13,color:RED},
  stepIndicator:{paddingTop:5,flexDirection:'row',justifyContent:'center',alignItems:'center'},stepDot:{width:7,height:7,borderRadius:3.5},
  fieldBox:{height:60,backgroundColor:FIELD_BG,borderRadius:15},fieldInner:{flex:1,marginTop:11,marginLeft:2,flexDirection:'row',alignItems:'center'},
  prefixIcon:{width:48,alignItems:'center',justifyContent:'center'},suffixButton:{width:48,height:48,alignItems:'center',justifyContent:'center'},
  textInput:{flex:1,height:'100%',padding:0,fontSize:18,fontWeight:'400',color:FIELD_TEXT},
  fieldError:{fontSize:13,fontWeight:'500',color:RED},forgotRow:{paddingTop:8,paddingLeft:15,paddingRight:15,alignItems:'flex-end'},
  forgotText:{fontSize:14,fontWeight:'600',color:LINK},submitWrap:{paddingLeft:15,paddingRight:15,paddingTop:20},
  submitButton:{width:'100%',height:60,backgroundColor:PINK,borderRadius:15,alignItems:'center',justifyContent:'center'},
  submitText:{fontSize:18,fontWeight:'600',color:'#FFFFFF'},submitContent:{flexDirection:'row',alignItems:'center',justifyContent:'center',gap:8},
  socialRow:{paddingTop:30,flexDirection:'row',justifyContent:'center'},socialButton:{width:100,height:50,backgroundColor:'#FFFFFF',borderWidth:.5,borderColor:FIELD_TEXT,borderRadius:10,alignItems:'center',justifyContent:'center'},
  googleFallback:{fontSize:22,fontWeight:'600',color:'#4B39EF'},errorMessageWrap:{paddingTop:5,paddingLeft:15,paddingRight:15,alignItems:'flex-start'},
  bottomSwitch:{paddingTop:5,paddingBottom:10,alignItems:'center'},bottomSwitchText:{textAlign:'center',fontSize:15,fontWeight:'400',color:DARK},bottomSwitchLink:{fontSize:14.5,fontWeight:'600',color:LINK},

  homePage:{flex:1,backgroundColor:'#FFFFFF'},
  tabBar:{height:100,backgroundColor:'#FBE8EF',flexDirection:'row',alignItems:'flex-end'},
  tab:{height:50,marginRight:8,borderTopLeftRadius:30,borderTopRightRadius:50,alignItems:'center',justifyContent:'center',position:'relative'},
  tabText:{fontFamily:MANROPE,fontSize:12,fontWeight:'600',color:DARK,textAlign:'center'},
  liveBadge:{position:'absolute',right:5,bottom:4,width:20,height:20,borderRadius:10,backgroundColor:'#DAAE67',alignItems:'center',justifyContent:'center'},
  searchBar:{marginTop:8,marginHorizontal:10,height:47,borderWidth:1.75,borderColor:'#DAAE67',borderRadius:10,flexDirection:'row',alignItems:'center',paddingLeft:2,paddingRight:4},
  searchDivider:{width:1.8,height:30,backgroundColor:'#CCCCCC',marginHorizontal:7},
  sloganViewport:{width:211.6,height:47,overflow:'hidden',justifyContent:'center',alignItems:'center'},
  sloganText:{fontFamily:'Montserrat',fontSize:15,fontStyle:'italic',fontWeight:'600',color:DARK,textAlign:'center'},
  searchButton:{height:30,paddingHorizontal:16,backgroundColor:PINK,borderRadius:8,alignItems:'center',justifyContent:'center',marginLeft:7},
  searchButtonText:{fontFamily:MANROPE,fontSize:13,fontWeight:'600',color:'#FFFFFF'},
  homeScrollContent:{paddingTop:6,paddingBottom:20},
  dragContainer:{width:'100%',position:'relative',overflow:'hidden'},
  absoluteCategory:{position:'absolute',width:'100%',height:78},
  categoryCircle:{width:52,height:52,borderRadius:26,overflow:'hidden',marginTop:5},
  categoryImage:{width:52,height:52},
  categoryLabel:{fontFamily:MANROPE,fontSize:11,fontWeight:'600',color:'#3A3A3A',marginTop:5,textAlign:'center',maxWidth:72},
  teaserArea:{position:'absolute',left:0,right:0,top:88,height:70,flexDirection:'row'},
  teaserCard:{flex:1,marginLeft:8,marginRight:4,marginTop:0,padding:8,borderRadius:12,backgroundColor:'#FBEAF0',height:70},
  teaserCard2:{backgroundColor:'#FCEFD9'},teaserTitleRow:{flexDirection:'row',alignItems:'center',gap:4},teaserTitle:{fontFamily:MANROPE,fontSize:11,fontWeight:'600'},teaserInner:{height:36,borderRadius:8,overflow:'hidden',marginTop:4},featuredInner:{flex:1,backgroundColor:'#E8C7D8'},flashInner:{flex:1,backgroundColor:'#F0D9A0'},teaserCaption:{fontFamily:MANROPE,fontSize:10,fontWeight:'500',marginTop:2},
  swipeIndicator:{position:'absolute',left:0,right:0,height:10,alignItems:'center',justifyContent:'center',flexDirection:'row',gap:2},indicatorLine:{width:14,height:4,borderRadius:2},indicatorDot:{width:6,height:6,borderRadius:3},
  promoBanner:{marginTop:6,marginHorizontal:6,height:150,borderRadius:16,padding:10,backgroundColor:'#A789B1'},
  promoCards:{height:98,flexDirection:'row',gap:6},voucherCard:{width:82,height:90,borderRadius:10,backgroundColor:'#FFFFFF',padding:7,justifyContent:'center'},voucherText:{fontFamily:MANROPE,fontSize:12,fontWeight:'600',color:DARK,textAlign:'center'},
  promoImageCard:{flex:1,height:90,borderRadius:10,overflow:'hidden',backgroundColor:'#D8B7E0'},promoColor:{flex:1,backgroundColor:'#C9A8DE'},promoCaption:{position:'absolute',left:7,bottom:6,fontFamily:MANROPE,fontSize:11,fontWeight:'600',color:'#FFFFFF'},
  notificationStrip:{height:32,borderRadius:8,backgroundColor:'rgba(0,0,0,.55)',flexDirection:'row',alignItems:'center',paddingHorizontal:8,gap:7},notificationText:{fontFamily:MANROPE,fontSize:10,fontWeight:'500',color:'#FFFFFF'},
  placeholderGrid:{padding:8,flexDirection:'row',flexWrap:'wrap',gap:12},placeholderTile:{width:'47%',aspectRatio:1,borderRadius:12,backgroundColor:'#F4F4F4'},
  bottomNav:{position:'absolute',left:8,right:8,bottom:10,height:80,borderRadius:20,backgroundColor:'#FFFFFF',elevation:6,shadowOpacity:.12,shadowRadius:8,shadowOffset:{width:0,height:2},flexDirection:'row',alignItems:'center',paddingHorizontal:2},
  navItem:{flex:1,height:76,alignItems:'center',justifyContent:'center'},navLogoCircle:{width:60,height:60,borderRadius:30,borderWidth:1.5,borderColor:'#D593B0',alignItems:'center',justifyContent:'center',overflow:'hidden'},navLogo:{width:58,height:58,borderRadius:29},navLabel:{fontFamily:MANROPE,fontSize:10,fontWeight:'600',color:PINK,marginTop:1},
  popupPosition:{position:'absolute',left:8,right:23,bottom:96},popup:{height:40,borderRadius:20,backgroundColor:'#FBE8EF',flexDirection:'row',alignItems:'center',paddingHorizontal:8,gap:7},popupBadge:{height:28,minWidth:54,paddingHorizontal:8,borderRadius:14,backgroundColor:PINK,alignItems:'center',justifyContent:'center'},popupBadgeText:{fontFamily:MANROPE,fontSize:9,fontWeight:'700',color:'#FFFFFF'},popupText:{flex:1,fontFamily:MANROPE,fontSize:11,fontWeight:'600',color:'#A789B1'},
});
