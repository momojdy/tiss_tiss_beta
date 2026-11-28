import {Platform} from 'react-native';
import type {MapViewProps} from 'react-native-maps';

// Use the real installed platform renderer. No static coastline, raster overlay,
// custom tile server or camera controlled from React during a native gesture.
export type HabitaMapLayer='standard'|'satellite';
const light=[
 {elementType:'geometry',stylers:[{color:'#eee4d2'}]},
 {elementType:'labels.text.fill',stylers:[{color:'#51483c'}]},
 {elementType:'labels.text.stroke',stylers:[{color:'#faf6eb'}]},
 {featureType:'administrative',elementType:'geometry.stroke',stylers:[{color:'#ad9f89'}]},
 {featureType:'landscape.natural',elementType:'geometry',stylers:[{color:'#e2ddc8'}]},
 {featureType:'poi.park',elementType:'geometry',stylers:[{color:'#cad4b8'}]},
 {featureType:'poi',elementType:'labels.text.fill',stylers:[{color:'#5b6552'}]},
 {featureType:'road',elementType:'geometry.fill',stylers:[{color:'#fffaf0'}]},
 {featureType:'road',elementType:'geometry.stroke',stylers:[{color:'#c9bcaa'}]},
 {featureType:'road.highway',elementType:'geometry.fill',stylers:[{color:'#dcc498'}]},
 {featureType:'road.highway',elementType:'geometry.stroke',stylers:[{color:'#bba887'}]},
 {featureType:'road',elementType:'labels.text.fill',stylers:[{color:'#594e40'}]},
 {featureType:'transit.line',elementType:'geometry',stylers:[{color:'#b7b3a5'}]},
 {featureType:'water',elementType:'geometry',stylers:[{color:'#b5cbd0'}]},
 {featureType:'water',elementType:'labels.text.fill',stylers:[{color:'#45676f'}]},
];
const dark=[
 {elementType:'geometry',stylers:[{color:'#39332e'}]},
 {elementType:'labels.text.fill',stylers:[{color:'#e7ddc9'}]},
 {elementType:'labels.text.stroke',stylers:[{color:'#302b27'}]},
 {featureType:'administrative',elementType:'geometry.stroke',stylers:[{color:'#81745e'}]},
 {featureType:'landscape.natural',elementType:'geometry',stylers:[{color:'#414238'}]},
 {featureType:'poi.park',elementType:'geometry',stylers:[{color:'#404c3b'}]},
 {featureType:'poi',elementType:'labels.text.fill',stylers:[{color:'#c4cbb5'}]},
 {featureType:'road',elementType:'geometry.fill',stylers:[{color:'#60574b'}]},
 {featureType:'road',elementType:'geometry.stroke',stylers:[{color:'#3b352f'}]},
 {featureType:'road.highway',elementType:'geometry.fill',stylers:[{color:'#8e7550'}]},
 {featureType:'road.highway',elementType:'geometry.stroke',stylers:[{color:'#524536'}]},
 {featureType:'road',elementType:'labels.text.fill',stylers:[{color:'#efe5d2'}]},
 {featureType:'transit.line',elementType:'geometry',stylers:[{color:'#696960'}]},
 {featureType:'water',elementType:'geometry',stylers:[{color:'#293f47'}]},
 {featureType:'water',elementType:'labels.text.fill',stylers:[{color:'#a9c5ca'}]},
];
export const boundaryInk=(isDark:boolean)=>isDark?'#9bcdd8':'#438fae';
export function nativeMapAppearance(isDark:boolean,layer:HabitaMapLayer):Pick<MapViewProps,'mapType'|'customMapStyle'|'userInterfaceStyle'|'showsPointsOfInterest'|'showsBuildings'>{
 return {mapType:layer==='satellite'?'hybrid':Platform.OS==='ios'?'mutedStandard':'standard',customMapStyle:Platform.OS==='android'&&layer==='standard'?(isDark?dark:light):undefined,userInterfaceStyle:isDark?'dark':'light',showsPointsOfInterest:true,showsBuildings:true};
}
