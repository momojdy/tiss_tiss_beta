import React, {forwardRef} from 'react';
import {Text, View, type ViewProps} from 'react-native';

// Native map codegen cannot run on the web. Keep its space and show an honest unavailable state.
const NativeMap = forwardRef<unknown, ViewProps>(function NativeMap({style, accessibilityLabel, testID}, _ref) {
  void _ref;
  return <View style={[style, {alignItems: 'center', justifyContent: 'center', backgroundColor: '#F3F4F6'}]} testID={testID} accessibilityRole="text">
    <Text style={{color: '#374151'}}>{accessibilityLabel || 'Map unavailable'}</Text>
  </View>;
});

const NativeOverlay = () => null;
export {NativeOverlay as Marker, NativeOverlay as Polyline, NativeOverlay as Circle, NativeOverlay as UrlTile};
export default NativeMap;
