-- Funds move only through the verified, atomic RPC. Enabled after rollback-safe QA:
-- 60/40 + full payment, idempotency, overpayment guard, true Goodies order settlement,
-- split-refund after cancellation, failed-finalization refund and expiry refund.
grant execute on function public.help_pay_contribute_wallet(uuid,bigint,text) to authenticated;
