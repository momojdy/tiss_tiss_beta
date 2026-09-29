import type { ComponentProps } from 'react';
import type { MaterialIcons } from '@expo/vector-icons';
export type IconName = ComponentProps<typeof MaterialIcons>['name'];
export type Category = { label:string; icon:IconName; image:string };
const BASE='https://raw.githubusercontent.com/momojdy/tiss_icons_assets/refs/heads/main/';
export const collapsedCategories:Category[]=[
{label:'Goodies',icon:'card-giftcard',image:BASE+'Goodies.PNG'},
{label:'Woulib',icon:'shopping-bag',image:BASE+'Woulib.PNG'},
{label:'Services',icon:'miscellaneous-services',image:BASE+'Services.PNG'},
{label:'Globiz',icon:'language',image:BASE+'Globiz.PNG'},
{label:'Konsoliss',icon:'people-outline',image:BASE+'Konsoliss.PNG'}];
export const expandedCategories:Category[]=[
{label:'Stays',icon:'home',image:BASE+'stays.PNG'},
{label:'Flyz',icon:'flight',image:BASE+'Flyz.PNG'},
{label:'Habita',icon:'hotel',image:BASE+'Habita.PNG'},
{label:'Rideza',icon:'directions-car',image:BASE+'Rideza%20.PNG'},
{label:'Frenzies',icon:'people',image:BASE+'Frenzies.PNG'},
{label:'Arts & Lits',icon:'palette',image:BASE+'Arts_lits.PNG'},
{label:'Streamz',icon:'play-circle-filled',image:BASE+'Streamz.PNG'},
{label:'Gatherz',icon:'event',image:BASE+'Gatherz.PNG'},
{label:'Glowz',icon:'lightbulb',image:BASE+'Glowz.PNG'},
{label:'Prezo',icon:'card-giftcard',image:BASE+'Prezo%20.PNG'},
{label:'Top Up',icon:'account-balance-wallet',image:BASE+'Topup.PNG'},
{label:'Deals',icon:'local-offer',image:BASE+'Deals.PNG'},
{label:'Bidz',icon:'gavel',image:BASE+'Bidz.PNG'},
{label:'Lutz',icon:'shopping-basket',image:BASE+'Lutz.PNG'},
{label:'More',icon:'more-horiz',image:BASE+'More.PNG'}];