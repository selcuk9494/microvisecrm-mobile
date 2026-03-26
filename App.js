import React from 'react';
import { SafeAreaView, StatusBar, Platform } from 'react-native';
import { WebView } from 'react-native-webview';
import Constants from 'expo-constants';

// Vercel deployment'ı yenilendiğinde önbellekten eski (404) sayfanın gelmesini engellemek için
// URL'in sonuna rastgele bir query string ekliyoruz.
const baseUrl = process.env.EXPO_PUBLIC_WEB_ORIGIN || 'https://microvisecrm-api-2qfo.vercel.app/';
const WEB_URL = `${baseUrl}?v=${Date.now()}`;

export default function App() {
  if (Platform.OS === 'web') {
    if (typeof window !== 'undefined') window.location.replace(WEB_URL);
    return null;
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#ffffff', paddingTop: Constants.statusBarHeight }}>
      <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />
      <WebView 
        source={{ uri: WEB_URL }}
        style={{ flex: 1 }}
        startInLoadingState={true}
        javaScriptEnabled={true}
        domStorageEnabled={true}
        allowsInlineMediaPlayback={true}
        bounces={false}
        cacheEnabled={false}
        incognito={true}
      />
    </SafeAreaView>
  );
}
