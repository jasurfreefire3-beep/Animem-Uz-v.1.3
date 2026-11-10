import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:url_launcher/url_launcher.dart';
import '../../core/constants/api_constants.dart';
import '../../core/constants/app_colors.dart';
import '../../core/services/update_service.dart';
import '../../providers/auth_provider.dart';
import '../auth/auth_gate_screen.dart';

class ProfileScreen extends StatelessWidget {
  const ProfileScreen({super.key});

  void _openUrl(String url) async {
    final uri = Uri.parse(url);
    if (await canLaunchUrl(uri)) {
      await launchUrl(uri, mode: LaunchMode.externalApplication);
    }
  }

  @override
  Widget build(BuildContext context) {
    final auth = Provider.of<AuthProvider>(context);
    final user = auth.user;
    final isGuest = auth.isGuest || user == null;

    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(
        backgroundColor: AppColors.background,
        elevation: 0,
        title: const Text(
          "Profil va Sozlamalar",
          style: TextStyle(
            color: Colors.white,
            fontSize: 20,
            fontWeight: FontWeight.w800,
          ),
        ),
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.fromLTRB(16, 8, 16, 100),
        physics: const BouncingScrollPhysics(),
        child: Column(
          children: [
            // 1. User Card
            Container(
              padding: const EdgeInsets.all(20),
              decoration: BoxDecoration(
                color: const Color(0xFF141320),
                borderRadius: BorderRadius.circular(24),
                border: Border.all(color: Colors.white.withOpacity(0.08)),
              ),
              child: isGuest
                  ? Column(
                      children: [
                        Row(
                          children: [
                            Container(
                              width: 54,
                              height: 54,
                              decoration: BoxDecoration(
                                shape: BoxShape.circle,
                                color: const Color(0xFF222035),
                                border: Border.all(color: Colors.white.withOpacity(0.1)),
                              ),
                              child: const Icon(Icons.person_rounded, color: Colors.white70, size: 28),
                            ),
                            const SizedBox(width: 14),
                            const Expanded(
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Text(
                                    "Mehmon Foydalanuvchi",
                                    style: TextStyle(
                                      color: Colors.white,
                                      fontSize: 16,
                                      fontWeight: FontWeight.w700,
                                    ),
                                  ),
                                  SizedBox(height: 3),
                                  Text(
                                    "Animem Uz platformasi",
                                    style: TextStyle(color: AppColors.textMuted, fontSize: 13),
                                  ),
                                ],
                              ),
                            ),
                          ],
                        ),
                        const SizedBox(height: 16),
                        GestureDetector(
                          onTap: () {
                            Navigator.of(context).push(
                              MaterialPageRoute(builder: (_) => const AuthGateScreen()),
                            );
                          },
                          child: Container(
                            width: double.infinity,
                            height: 44,
                            decoration: BoxDecoration(
                              gradient: AppColors.primaryGradient,
                              borderRadius: BorderRadius.circular(14),
                            ),
                            child: const Center(
                              child: Text(
                                "Tizimga Kirish / Ro'yxatdan O'tish",
                                style: TextStyle(
                                  color: Colors.white,
                                  fontSize: 14,
                                  fontWeight: FontWeight.w700,
                                ),
                              ),
                            ),
                          ),
                        ),
                      ],
                    )
                  : Row(
                      children: [
                        Container(
                          width: 58,
                          height: 58,
                          decoration: const BoxDecoration(
                            shape: BoxShape.circle,
                            gradient: AppColors.primaryGradient,
                          ),
                          child: Center(
                            child: Text(
                              (user.name.isNotEmpty ? user.name[0] : 'A').toUpperCase(),
                              style: const TextStyle(
                                color: Colors.white,
                                fontSize: 24,
                                fontWeight: FontWeight.w800,
                              ),
                            ),
                          ),
                        ),
                        const SizedBox(width: 16),
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(
                                user.name,
                                style: const TextStyle(
                                  color: Colors.white,
                                  fontSize: 17,
                                  fontWeight: FontWeight.w800,
                                ),
                              ),
                              const SizedBox(height: 3),
                              Text(
                                user.email,
                                style: const TextStyle(
                                  color: AppColors.textMuted,
                                  fontSize: 13,
                                ),
                              ),
                            ],
                          ),
                        ),
                        IconButton(
                          tooltip: "Chiqish",
                          icon: const Icon(Icons.logout_rounded, color: AppColors.error),
                          onPressed: () => auth.logout(),
                        ),
                      ],
                    ),
            ),

            const SizedBox(height: 20),

            // 2. Official Channels Section
            _buildSectionHeader("Rasmiy Hamkorlik va Kanallar"),
            _buildSettingsCard([
              _buildSettingsTile(
                icon: Icons.send_rounded,
                iconColor: const Color(0xFF0088CC),
                title: "Telegram Bot",
                subtitle: "@Animem_uz_bot orqali epizodlarni tomosha qiling",
                onTap: () => _openUrl("https://t.me/${ApiConstants.telegramBotUsername}"),
              ),
              const Divider(color: Colors.white10, height: 1),
              _buildSettingsTile(
                icon: Icons.language_rounded,
                iconColor: const Color(0xFF00E5FF),
                title: "Rasmiy Veb-Sayt",
                subtitle: "animem.uz platformasiga o'tish",
                onTap: () => _openUrl("https://animem.uz"),
              ),
            ]),

            const SizedBox(height: 20),

            // 3. App System & Updates
            _buildSectionHeader("Ilova va Yangilanishlar"),
            _buildSettingsCard([
              _buildSettingsTile(
                icon: Icons.system_update_rounded,
                iconColor: AppColors.primary,
                title: "Yangilanishlarni tekshirish",
                subtitle: "Hozirgi versiya: v1.0.0",
                onTap: () => UpdateService.checkAndShowPrompt(context),
              ),
              const Divider(color: Colors.white10, height: 1),
              _buildSettingsTile(
                icon: Icons.cleaning_services_rounded,
                iconColor: AppColors.accentGold,
                title: "Keshni tozalash",
                subtitle: "Vaqtinchalik rasmlar va videolarni tozalash",
                onTap: () {
                  ScaffoldMessenger.of(context).showSnackBar(
                    const SnackBar(
                      content: Text("Ilova keshi muvaffaqiyatli tozalandi!"),
                      duration: Duration(seconds: 2),
                    ),
                  );
                },
              ),
            ]),

            const SizedBox(height: 24),

            // Footer note
            Center(
              child: Text(
                "Animem Uz • O'zbekiston Milliy Anime Portali\nBarcha huquqlar himoyalangan",
                textAlign: TextAlign.center,
                style: TextStyle(
                  color: Colors.white.withOpacity(0.35),
                  fontSize: 11,
                  height: 1.5,
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildSectionHeader(String title) {
    return Padding(
      padding: const EdgeInsets.only(left: 4, bottom: 8),
      child: Align(
        alignment: Alignment.centerLeft,
        child: Text(
          title,
          style: const TextStyle(
            color: AppColors.textMuted,
            fontSize: 12,
            fontWeight: FontWeight.w700,
            letterSpacing: 0.5,
          ),
        ),
      ),
    );
  }

  Widget _buildSettingsCard(List<Widget> children) {
    return Container(
      decoration: BoxDecoration(
        color: const Color(0xFF141320),
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: Colors.white.withOpacity(0.08)),
      ),
      child: Column(children: children),
    );
  }

  Widget _buildSettingsTile({
    required IconData icon,
    required Color iconColor,
    required String title,
    required String subtitle,
    required VoidCallback onTap,
  }) {
    return ListTile(
      onTap: onTap,
      contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 4),
      leading: Container(
        width: 40,
        height: 40,
        decoration: BoxDecoration(
          color: iconColor.withOpacity(0.12),
          borderRadius: BorderRadius.circular(12),
        ),
        child: Icon(icon, color: iconColor, size: 22),
      ),
      title: Text(
        title,
        style: const TextStyle(color: Colors.white, fontSize: 14, fontWeight: FontWeight.w700),
      ),
      subtitle: Text(
        subtitle,
        style: const TextStyle(color: AppColors.textMuted, fontSize: 12),
      ),
      trailing: const Icon(Icons.arrow_forward_ios_rounded, color: AppColors.textMuted, size: 14),
    );
  }
}
