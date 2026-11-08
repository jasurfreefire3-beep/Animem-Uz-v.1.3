import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../core/constants/app_colors.dart';
import '../../providers/auth_provider.dart';
import '../../widgets/liquid_glass_container.dart';
import '../../widgets/neon_glow_button.dart';
import 'email_otp_screen.dart';
import '../main_shell_screen.dart';

class AuthGateScreen extends StatelessWidget {
  const AuthGateScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final auth = Provider.of<AuthProvider>(context);

    // If user got authorized via Telegram polling, navigate into the app
    if (auth.isAuthenticated) {
      WidgetsBinding.instance.addPostFrameCallback((_) {
        Navigator.of(context).pushReplacement(
          MaterialPageRoute(builder: (_) => const MainShellScreen()),
        );
      });
    }

    return Scaffold(
      backgroundColor: AppColors.background,
      body: Stack(
        children: [
          // Background Hero Anime Art
          Positioned.fill(
            child: Image.network(
              'https://images.unsplash.com/photo-1578632767115-351597cf2477?w=1200&auto=format&fit=crop&q=80',
              fit: BoxFit.cover,
            ),
          ),

          // Deep Dark Gradient Overlay
          Positioned.fill(
            child: Container(
              decoration: BoxDecoration(
                gradient: LinearGradient(
                  begin: Alignment.topCenter,
                  end: Alignment.bottomCenter,
                  colors: [
                    Colors.black.withOpacity(0.3),
                    const Color(0xCC07070A),
                    const Color(0xFF07070A),
                  ],
                  stops: const [0.0, 0.45, 0.85],
                ),
              ),
            ),
          ),

          // Ambient Neon Glow Blobs
          Positioned(
            top: -60,
            right: -60,
            child: Container(
              width: 220,
              height: 220,
              decoration: BoxDecoration(
                shape: BoxShape.circle,
                color: AppColors.primary.withOpacity(0.2),
              ),
            ),
          ),

          // Main Interactive Content
          SafeArea(
            child: Padding(
              padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  // Top Brand Header
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Row(
                        children: [
                          Container(
                            width: 36,
                            height: 36,
                            decoration: const BoxDecoration(
                              shape: BoxShape.circle,
                              gradient: AppColors.primaryGradient,
                            ),
                            child: const Center(
                              child: Icon(Icons.play_arrow_rounded, color: Colors.white, size: 22),
                            ),
                          ),
                          const SizedBox(width: 10),
                          const Text(
                            "ANIMEM.UZ",
                            style: TextStyle(
                              color: Colors.white,
                              fontSize: 18,
                              fontWeight: FontWeight.w800,
                              letterSpacing: 1.2,
                            ),
                          ),
                        ],
                      ),
                      // Guest Mode Button (Top Right)
                      TextButton(
                        onPressed: () {
                          auth.continueAsGuest();
                          Navigator.of(context).pushReplacement(
                            MaterialPageRoute(builder: (_) => const MainShellScreen()),
                          );
                        },
                        child: const Text(
                          "Mehmon",
                          style: TextStyle(
                            color: AppColors.accentCyan,
                            fontSize: 14,
                            fontWeight: FontWeight.w600,
                          ),
                        ),
                      ),
                    ],
                  ),

                  const Spacer(),

                  // Welcome Title & Value Proposition
                  const Text(
                    "Minglab animelarni\no'zbek tilida tomosha qiling",
                    style: TextStyle(
                      color: Colors.white,
                      fontSize: 28,
                      fontWeight: FontWeight.w800,
                      height: 1.25,
                    ),
                  ),
                  const SizedBox(height: 10),
                  const Text(
                    "Professional dublaj, jonli chat, cheksiz reels va sevimli fandub guruhlaringiz bitta ilovada!",
                    style: TextStyle(
                      color: AppColors.textSecondary,
                      fontSize: 14,
                      height: 1.4,
                    ),
                  ),
                  const SizedBox(height: 32),

                  // Authentication Options Card
                  LiquidGlassContainer(
                    padding: const EdgeInsets.all(20),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.stretch,
                      children: [
                        // 1. TELEGRAM 1-TAP LOGIN BUTTON
                        NeonGlowButton(
                          text: "Telegram orqali tezkor kirish",
                          icon: const Icon(Icons.send_rounded, color: Colors.white, size: 20),
                          gradient: const LinearGradient(
                            colors: [Color(0xFF0088CC), Color(0xFF00BFFF)],
                          ),
                          glowColor: const Color(0xFF0088CC),
                          isLoading: auth.isLoading && auth.tgSessionId != null,
                          onPressed: () {
                            auth.startTelegramLogin();
                          },
                        ),
                        const SizedBox(height: 14),

                        // 2. EMAIL OTP LOGIN BUTTON
                        OutlinedButton(
                          onPressed: () {
                            Navigator.of(context).push(
                              MaterialPageRoute(builder: (_) => const EmailOtpScreen()),
                            );
                          },
                          style: OutlinedButton.styleFrom(
                            side: BorderSide(color: Colors.white.withOpacity(0.2), width: 1.2),
                            padding: const EdgeInsets.symmetric(vertical: 16),
                            shape: RoundedRectangleBorder(
                              borderRadius: BorderRadius.circular(16),
                            ),
                          ),
                          child: const Row(
                            mainAxisAlignment: MainAxisAlignment.center,
                            children: [
                              Icon(Icons.mail_outline_rounded, color: Colors.white, size: 20),
                              SizedBox(width: 10),
                              Text(
                                "Email (Gmail) bilan kirish",
                                style: TextStyle(
                                  color: Colors.white,
                                  fontSize: 15,
                                  fontWeight: FontWeight.w600,
                                ),
                              ),
                            ],
                          ),
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(height: 16),

                  // Terms Note
                  const Text(
                    "Kirish orqali foydalanish shartlariga rozilik bildirasiz.",
                    textAlign: TextAlign.center,
                    style: TextStyle(
                      color: AppColors.textMuted,
                      fontSize: 11,
                    ),
                  ),
                  const SizedBox(height: 12),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }
}
