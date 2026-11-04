-- Goodies order media snapshots, isolated Goodies address defaults, and wallet alerts.
-- Customer-owned notification updates are restricted by the existing own-row RLS policy.
GRANT UPDATE ON TABLE public.notifications TO authenticated;

-- Wallet notifications are read through the wallet notification RPCs. Create one
-- only when a wallet transaction reaches its completed state, and make retries idempotent.
CREATE UNIQUE INDEX IF NOT EXISTS wallet_notifications_transaction_ref_uidx
  ON public.wallet_notifications (user_id, reference_id)
  WHERE reference_id LIKE 'wallet_transaction:%';

CREATE SCHEMA IF NOT EXISTS private;

CREATE OR REPLACE FUNCTION private.notify_wallet_transaction()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
DECLARE
  v_type text;
  v_title text;
  v_currency text;
  v_amount numeric;
  v_description text;
  v_body text;
BEGIN
  IF NEW.status IS DISTINCT FROM 'completed' THEN
    RETURN NEW;
  END IF;

  IF TG_OP = 'UPDATE' THEN
    IF OLD.status IS NOT DISTINCT FROM NEW.status THEN
      RETURN NEW;
    END IF;
  END IF;

  CASE lower(coalesce(NEW.activity_type, ''))
    WHEN 'send' THEN
      v_type := 'money_sent'; v_title := 'Money sent';
    WHEN 'receive' THEN
      v_type := 'money_received'; v_title := 'Money received';
    WHEN 'topup' THEN
      v_type := 'deposit'; v_title := 'Wallet topped up';
    WHEN 'withdrawal' THEN
      v_type := 'withdrawal'; v_title := 'Withdrawal completed';
    WHEN 'refund' THEN
      v_type := 'refund'; v_title := 'Refund received';
    WHEN 'purchase' THEN
      v_type := 'payment_success'; v_title := 'Payment successful';
    WHEN 'goodies_order_payment' THEN
      v_type := 'payment_success'; v_title := 'Goodies order paid';
    ELSE
      IF lower(coalesce(NEW.direction, '')) = 'credit' THEN
        v_type := 'money_received'; v_title := 'Money received';
      ELSE
        v_type := 'payment_success'; v_title := 'Payment successful';
      END IF;
  END CASE;

  v_currency := coalesce(nullif(btrim(NEW.wallet_currency), ''), nullif(btrim(NEW.original_currency), ''), 'USD');
  v_amount := abs(coalesce(NEW.wallet_amount, NEW.amount, 0));
  v_description := nullif(btrim(coalesce(NEW.description, '')), '');
  v_body := coalesce(v_description, v_title) || ' · ' || v_currency || ' ' || to_char(v_amount, 'FM9999999990.00');

  INSERT INTO public.wallet_notifications (
    user_id, title, body, notification_type, read, reference_id, metadata
  )
  VALUES (
    NEW.user_id, v_title, v_body, v_type, false,
    'wallet_transaction:' || NEW.id::text,
    jsonb_build_object(
      'transaction_id', NEW.id,
      'activity_type', NEW.activity_type,
      'direction', NEW.direction,
      'amount', v_amount,
      'currency', v_currency,
      'feature_name', NEW.feature_name
    )
  )
  ON CONFLICT (user_id, reference_id)
    WHERE reference_id LIKE 'wallet_transaction:%'
    DO NOTHING;

  RETURN NEW;
END;
$function$;

REVOKE ALL ON FUNCTION private.notify_wallet_transaction() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS wallet_transaction_notification ON public.wallet_transactions;
CREATE TRIGGER wallet_transaction_notification
AFTER INSERT OR UPDATE OF status ON public.wallet_transactions
FOR EACH ROW
EXECUTE FUNCTION private.notify_wallet_transaction();
