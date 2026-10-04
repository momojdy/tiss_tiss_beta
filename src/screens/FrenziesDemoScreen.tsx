import React, { useMemo, useState } from 'react';
import { Image, Pressable, SafeAreaView, ScrollView, StyleSheet, Text, View } from 'react-native';
import { MaterialCommunityIcons, MaterialIcons } from '@expo/vector-icons';
import { colors } from '../theme/frenziesTheme';
import FrenziesHeader from '../components/frenzies/FrenziesHeader';
import { fonts } from '../theme/frenziesFonts';
import { assets } from '../theme/frenziesAssets';

// restored to pre-outline version; see commit a211b123340f630d152f9b1157d36a1de839a145
