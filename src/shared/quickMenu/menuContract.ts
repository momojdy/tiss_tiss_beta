// Stable Wantiss Quick Menu order and action names; feature routing is supplied by the host.
export const primaryQuickActions=[['home','Home','home'],['messages','Messages','message-circle'],['notifications','Notifications','bell'],['wallet','Wallet','credit-card'],['saved','Saved','heart']] as const;
export const secondaryQuickActions=[['orders','My Orders','package'],['activity','Recent Activity','clock'],['help','Help Center','help-circle'],['feedback','Feedback','edit-3'],['business','Business Space','briefcase'],['dark','Dark Mode','moon']] as const;
export type QuickMenuAction=(typeof primaryQuickActions)[number][0]|(typeof secondaryQuickActions)[number][0];
export type QuickMenuHostAction=Exclude<QuickMenuAction,'saved'|'orders'|'dark'>;
export type QuickMenuInbox={notifications:number;messages:number;notificationColor:string;messageColor:string;status:'loading'|'ready'|'unavailable';retry:()=>void};
