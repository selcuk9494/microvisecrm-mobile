import React from 'react';
import { SafeAreaView, StatusBar, Platform } from 'react-native';
import { WebView } from 'react-native-webview';
import Constants from 'expo-constants';

// Çevresel değişkenlerle (ENV) ilgili tüm sorunları ortadan kaldırmak için URL'yi doğrudan (hardcode) gömüyoruz.
const baseUrl = 'https://microvisecrm-api-2qfo.vercel.app/';
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
