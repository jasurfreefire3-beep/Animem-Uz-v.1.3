import 'package:flutter/material.dart';

class AppColors {
  // Pure Deep OLED Dark Palette
  static const Color background = Color(0xFF07070A);
  static const Color surface = Color(0xFF0E0F17);
  static const Color surfaceLight = Color(0xFF161824);
  static const Color cardBg = Color(0xFF12131D);

  // Liquid Glass Shading
  static const Color glassFill = Color(0x14FFFFFF); // 8% white
  static const Color glassBorder = Color(0x22FFFFFF); // 13% white
  static const Color glassBorderGlow = Color(0x40FF006A);

  // Vibrant Anime Neons
  static const Color primary = Color(0xFFFF006A); // Hot Pink Neon
  static const Color primaryGlow = Color(0x66FF006A);
  static const Color secondary = Color(0xFF7928CA); // Cyber Purple
  static const Color accentCyan = Color(0xFF00F2FE); // Cyan Glow
  static const Color accentGold = Color(0xFFFFB800); // Star Gold
  static const Color success = Color(0xFF10B981);
  static const Color error = Color(0xFFEF4444);

  // Text Hierarchy
  static const Color textPrimary = Color(0xFFFFFFFF);
  static const Color textSecondary = Color(0xFF94A3B8);
  static const Color textMuted = Color(0xFF64748B);

  // Linear Gradient Accents
  static const LinearGradient primaryGradient = LinearGradient(
    colors: [Color(0xFFFF006A), Color(0xFF7928CA)],
    begin: Alignment.topLeft,
    end: Alignment.bottomRight,
  );

  static const LinearGradient cyanGradient = LinearGradient(
    colors: [Color(0xFF00F2FE), Color(0xFF4FACFE)],
    begin: Alignment.topLeft,
    end: Alignment.bottomRight,
  );

  static const LinearGradient cardOverlayGradient = LinearGradient(
    colors: [Colors.transparent, Color(0xCC07070A), Color(0xFF07070A)],
    stops: [0.0, 0.65, 1.0],
    begin: Alignment.topCenter,
    end: Alignment.bottomCenter,
  );
}
