import 'dart:ui';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:provider/provider.dart';
import 'core/theme/app_theme.dart';
import 'providers/anime_provider.dart';
import 'providers/auth_provider.dart';
import 'providers/chat_provider.dart';
import 'providers/fandub_provider.dart';
import 'providers/reels_provider.dart';
import 'screens/splash/splash_screen.dart';

void main() async {
  WidgetsFlutterBinding.ensureInitialized();

  // Prevent any unhandled UI or async exceptions from closing the app
  FlutterError.onError = (FlutterErrorDetails details) {
    FlutterError.dumpErrorToConsole(details);
  };
  PlatformDispatcher.instance.onError = (Object error, StackTrace stack) {
    debugPrint("Global handled error: $error");
    return true; // Prevents process termination
  };

  ErrorWidget.builder = (FlutterErrorDetails details) {
    return Container(
      color: const Color(0xFF0D0C13),
      alignment: Alignment.center,
      padding: const EdgeInsets.all(16),
      child: const Text(
        "Kutilmagan xatolik yuz berdi. Sahifani qayta yuklang.",
        textAlign: TextAlign.center,
        style: TextStyle(
          color: Colors.white70,
          fontSize: 13,
          decoration: TextDecoration.none,
        ),
      ),
    );
  };

  // Set Android & iOS Status bar style (Transparent Liquid Glass)
  SystemChrome.setSystemUIOverlayStyle(
    const SystemUiOverlayStyle(
      statusBarColor: Colors.transparent,
      statusBarIconBrightness: Brightness.light,
      statusBarBrightness: Brightness.dark,
      systemNavigationBarColor: Colors.black,
      systemNavigationBarIconBrightness: Brightness.light,
    ),
  );

  // Set default preferred orientation
  await SystemChrome.setPreferredOrientations([
    DeviceOrientation.portraitUp,
    DeviceOrientation.portraitDown,
  ]);

  runApp(const AnimemApp());
}

class AnimemApp extends StatelessWidget {
  const AnimemApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MultiProvider(
      providers: [
        ChangeNotifierProvider(create: (_) => AuthProvider()),
        ChangeNotifierProvider(create: (_) => AnimeProvider()),
        ChangeNotifierProvider(create: (_) => ReelsProvider()),
        ChangeNotifierProvider(create: (_) => FandubProvider()),
        ChangeNotifierProvider(create: (_) => ChatProvider()),
      ],
      child: MaterialApp(
        title: 'Animem Uz',
        debugShowCheckedModeBanner: false,
        theme: AppTheme.darkTheme,
        darkTheme: AppTheme.darkTheme,
        themeMode: ThemeMode.dark,
        home: const SplashScreen(),
      ),
    );
  }
}
