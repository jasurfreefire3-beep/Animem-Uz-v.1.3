import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:provider/provider.dart';
import 'package:url_launcher/url_launcher.dart';
import '../../core/constants/app_colors.dart';
import '../../models/fandub_model.dart';
import '../../providers/fandub_provider.dart';
import '../../widgets/cached_image_view.dart';
import '../../widgets/liquid_glass_container.dart';

class FandubScreen extends StatelessWidget {
  const FandubScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final fandubProvider = Provider.of<FandubProvider>(context);
    final fandubs = fandubProvider.fandubs;

    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(
        title: const Text(
          "Fandub Jamoalari",
          style: TextStyle(color: Colors.white, fontSize: 20, fontWeight: FontWeight.w800),
        ),
      ),
      body: fandubProvider.isLoading
          ? const Center(
              child: CircularProgressIndicator(
                strokeWidth: 2,
                valueColor: AlwaysStoppedAnimation<Color>(AppColors.primary),
              ),
            )
          : ListView.builder(
              padding: const EdgeInsets.fromLTRB(16, 12, 16, 100),
              physics: const BouncingScrollPhysics(),
              itemCount: fandubs.length,
              itemBuilder: (context, index) {
                final team = fandubs[index];
                return _FandubCardItem(
                  team: team,
                  onSubscribe: () => fandubProvider.toggleSubscription(team.id),
                );
              },
            ),
    );
  }
}

class _FandubCardItem extends StatelessWidget {
  final FandubModel team;
  final VoidCallback onSubscribe;

  const _FandubCardItem({
    required this.team,
    required this.onSubscribe,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      margin: const EdgeInsets.only(bottom: 16),
      child: LiquidGlassContainer(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Top Row: Logo, Name, Subscribers, Subscribe Button
            Row(
              children: [
                // Team Logo
                Container(
                  width: 54,
                  height: 54,
                  decoration: BoxDecoration(
                    shape: BoxShape.circle,
                    border: Border.all(color: AppColors.accentCyan, width: 1.5),
                  ),
                  child: CachedImageView(
                    imageUrl: team.logoUrl,
                    borderRadius: 27,
                  ),
                ),
                const SizedBox(width: 14),

                // Name & Stats
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Row(
                        children: [
                          Flexible(
                            child: Text(
                              team.name,
                              maxLines: 1,
                              overflow: TextOverflow.ellipsis,
                              style: const TextStyle(
                                color: Colors.white,
                                fontSize: 16,
                                fontWeight: FontWeight.w800,
                              ),
                            ),
                          ),
                          const SizedBox(width: 6),
                          const Icon(Icons.verified_rounded, color: AppColors.accentCyan, size: 16),
                        ],
                      ),
                      const SizedBox(height: 3),
                      Text(
                        "${team.subscribersCount} obunachi  •  ${team.membersCount} a'zo",
                        style: const TextStyle(
                          color: AppColors.textMuted,
                          fontSize: 12,
                        ),
                      ),
                    ],
                  ),
                ),

                // Subscribe Toggle Button
                GestureDetector(
                  onTap: () {
                    HapticFeedback.lightImpact();
                    onSubscribe();
                  },
                  child: AnimatedContainer(
                    duration: const Duration(milliseconds: 200),
                    padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
                    decoration: BoxDecoration(
                      gradient: team.isSubscribed ? null : AppColors.primaryGradient,
                      color: team.isSubscribed ? AppColors.surfaceLight : null,
                      borderRadius: BorderRadius.circular(20),
                      border: team.isSubscribed
                          ? Border.all(color: Colors.white.withOpacity(0.12))
                          : null,
                    ),
                    child: Text(
                      team.isSubscribed ? "Obunadasiz" : "Obuna bo'lish",
                      style: TextStyle(
                        color: team.isSubscribed ? AppColors.textSecondary : Colors.white,
                        fontSize: 12,
                        fontWeight: FontWeight.w700,
                      ),
                    ),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 12),

            // Description Bio
            Text(
              team.description,
              maxLines: 2,
              overflow: TextOverflow.ellipsis,
              style: const TextStyle(
                color: AppColors.textSecondary,
                fontSize: 13,
                height: 1.4,
              ),
            ),

            if (team.tgChannel != null) ...[
              const SizedBox(height: 12),
              // Telegram channel link
              GestureDetector(
                onTap: () async {
                  final url = Uri.parse("https://t.me/${team.tgChannel!.replaceAll('@', '')}");
                  if (await canLaunchUrl(url)) {
                    await launchUrl(url, mode: LaunchMode.externalApplication);
                  }
                },
                child: Container(
                  padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                  decoration: BoxDecoration(
                    color: const Color(0xFF0088CC).withOpacity(0.12),
                    borderRadius: BorderRadius.circular(10),
                  ),
                  child: Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      const Icon(Icons.send_rounded, color: Color(0xFF0088CC), size: 14),
                      const SizedBox(width: 6),
                      Text(
                        team.tgChannel!,
                        style: const TextStyle(
                          color: Color(0xFF0088CC),
                          fontSize: 12,
                          fontWeight: FontWeight.w600,
                        ),
                      ),
                    ],
                  ),
                ),
              ),
            ],
          ],
        ),
      ),
    );
  }
}
