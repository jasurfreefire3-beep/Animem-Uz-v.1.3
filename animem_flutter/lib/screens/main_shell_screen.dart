import 'package:flutter/material.dart';
import '../../core/constants/app_colors.dart';
import '../../widgets/custom_nav_bar.dart';
import 'home/home_screen.dart';
import 'fandubs/fandub_screen.dart';
import 'reels/reels_screen.dart';
import 'chat/live_chat_screen.dart';
import 'profile/profile_screen.dart';

class MainShellScreen extends StatefulWidget {
  const MainShellScreen({super.key});

  @override
  State<MainShellScreen> createState() => _MainShellScreenState();
}

class _MainShellScreenState extends State<MainShellScreen> {
  int _currentIndex = 0;

  final List<Widget> _screens = const [
    HomeScreen(),
    FandubScreen(),
    ReelsScreen(),
    LiveChatScreen(),
    ProfileScreen(),
  ];

  @override
  Widget build(BuildContext context) {
    // When on ReelsScreen (index 2), hide the bottom nav bar for true immersion!
    final isReels = _currentIndex == 2;

    return Scaffold(
      backgroundColor: AppColors.background,
      extendBody: true,
      body: IndexedStack(
        index: _currentIndex,
        children: _screens,
      ),
      bottomNavigationBar: isReels 
          ? null 
          : CustomNavBar(
              currentIndex: _currentIndex,
              onTap: (index) {
                setState(() => _currentIndex = index);
              },
            ),
    );
  }
}
