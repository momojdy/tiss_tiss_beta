import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

type Props = { shopName: string; vendorId: string; onBack: () => void };
export default function VendorShopScreen({ shopName, vendorId, onBack }: Props) {
  return <View style={styles.page}>
    <View style={styles.header}>
      <Pressable onPress={onBack} style={styles.back}><Ionicons name="chevron-back" size={23} color="#17243A" /></Pressable>
      <Text style={styles.headerTitle}>Wantiss shop</Text>
    </View>
    <ScrollView contentContainerStyle={styles.content}>
      <View style={styles.hero}>
        <View style={styles.shopIcon}><Ionicons name="storefront-outline" size={34} color="#397BC6" /></View>
        <Text style={styles.shopName}>{shopName}</Text>
        <Text style={styles.subtitle}>Public shop</Text>
        <View style={styles.vendorId}><Text style={styles.idLabel}>VENDOR ID</Text><Text selectable style={styles.idValue}>{vendorId}</Text></View>
      </View>
      <View style={styles.info}>
        <Ionicons name="shield-checkmark-outline" size={22} color="#397BC6" />
        <View style={{ flex: 1 }}>
          <Text style={styles.infoTitle}>You’re viewing the public shop</Text>
          <Text style={styles.infoText}>This destination came from a server-validated Wantiss shop QR. It does not open the vendor’s private Business Space.</Text>
        </View>
      </View>
      <View style={styles.empty}>
        <Ionicons name="bag-handle-outline" size={34} color="#9AA7B7" />
        <Text style={styles.emptyTitle}>Shop catalog</Text>
        <Text style={styles.emptyText}>The current catalog schema doesn’t link public products to a business, so this screen won’t show unrelated products. Shop items can appear here once that relationship is available.</Text>
      </View>
    </ScrollView>
  </View>;
}
const styles=StyleSheet.create({
 page:{flex:1,backgroundColor:'#F5F8FC'},header:{height:58,flexDirection:'row',alignItems:'center',paddingHorizontal:14,backgroundColor:'#FFF',borderBottomWidth:1,borderBottomColor:'#E4EAF2'},back:{width:38,height:38,alignItems:'center',justifyContent:'center'},headerTitle:{fontSize:17,fontWeight:'800',color:'#17243A',marginLeft:6},content:{padding:16,gap:14,paddingBottom:34},hero:{alignItems:'center',padding:22,backgroundColor:'#EEF5FF',borderColor:'#C7DDFB',borderWidth:1,borderRadius:22},shopIcon:{width:72,height:72,borderRadius:22,alignItems:'center',justifyContent:'center',backgroundColor:'#FFF'},shopName:{fontSize:24,fontWeight:'800',color:'#17243A',marginTop:14,textAlign:'center'},subtitle:{fontSize:13,color:'#62748A',marginTop:5},vendorId:{marginTop:18,padding:12,borderRadius:12,backgroundColor:'#FFF',alignSelf:'stretch',alignItems:'center'},idLabel:{fontSize:10,fontWeight:'800',letterSpacing:1,color:'#397BC6'},idValue:{fontSize:15,fontWeight:'800',color:'#17243A',marginTop:5},info:{flexDirection:'row',alignItems:'flex-start',gap:12,padding:15,borderRadius:16,backgroundColor:'#FFF'},infoTitle:{fontSize:14,fontWeight:'800',color:'#17243A'},infoText:{fontSize:12,color:'#66768A',lineHeight:18,marginTop:5},empty:{alignItems:'center',padding:24,borderRadius:18,backgroundColor:'#FFF',gap:8},emptyTitle:{fontSize:16,fontWeight:'800',color:'#17243A'},emptyText:{fontSize:12,color:'#66768A',lineHeight:18,textAlign:'center'}
});