import 'dart:ui';
import 'package:dio/dio.dart';
import 'package:flutter/material.dart';
import 'package:url_launcher/url_launcher.dart';
import '../constants/api_constants.dart';
import '../constants/app_colors.dart';

class AppUpdateInfo {
  final String latestVersion;
  final int versionCode;
  final String apkUrl;
  final String releaseNotes;
  final bool forceUpdate;

  AppUpdateInfo({
    required this.latestVersion,
    required this.versionCode,
    required this.apkUrl,
    required this.releaseNotes,
    this.forceUpdate = false,
  });

  factory AppUpdateInfo.fromJson(Map<String, dynamic> json) {
    return AppUpdateInfo(
      latestVersion: json['latestVersion']?.toString() ?? '1.0.0',
      versionCode: int.tryParse(json['versionCode']?.toString() ?? '1') ?? 1,
      apkUrl: json['apkUrl']?.toString() ?? 'https://animem-uz-jasurfreefire3.wasmer.app',
      releaseNotes: json['releaseNotes']?.toString() ?? "Ilovada yangi imkoniyatlar va yaxshilanishlar qo'shildi!",
      forceUpdate: json['forceUpdate'] == true,
    );
  }
}

class UpdateService {
  // Current App Installed Version
  static const int currentVersionCode = 1;
  static const String currentVersionName = '1.0.0';

  static bool _hasCheckedThisSession = false;

  /// Check if a newer version exists on Wasmer / Animem server
  static Future<AppUpdateInfo?> checkForUpdate() async {
    try {
      final dio = Dio(BaseOptions(
        connectTimeout: const Duration(seconds: 8),
        receiveTimeout: const Duration(seconds: 8),
      ));

      final res = await dio.get("${ApiConstants.baseUrl}/api/app/version");
      if (res.statusCode == 200 && res.data != null) {
        final data = res.data is Map<String, dynamic> ? res.data : Map<String, dynamic>.from(res.data);
        final updateInfo = AppUpdateInfo.fromJson(data);
        if (updateInfo.versionCode > currentVersionCode) {
          return updateInfo;
        }
      }
    } catch (_) {
      // Quietly ignore network/offline issues during update check
    }
    return null;
  }

  /// Automatically prompt user if update is available
  static Future<void> checkAndShowPrompt(BuildContext context) async {
    if (_hasCheckedThisSession) return;
    _hasCheckedThisSession = true;

    final update = await checkForUpdate();
    if (update != null && context.mounted) {
      showUpdateDialog(context, update);
    }
  }

  /// Display 3D Glassmorphic Update Modal
  static void showUpdateDialog(BuildContext context, AppUpdateInfo update) {
    showDialog(
      context: context,
      barrierDismissible: !update.forceUpdate,
      builder: (ctx) {
        return PopScope(
          canPop: !update.forceUpdate,
          child: Dialog(
            backgroundColor: Colors.transparent,
            insetPadding: const EdgeInsets.symmetric(horizontal: 20, vertical: 24),
            child: ClipRRect(
              borderRadius: BorderRadius.circular(28),
              child: BackdropFilter(
                filter: ImageFilter.blur(sigmaX: 18, sigmaY: 18),
                child: Container(
                  padding: const EdgeInsets.all(24),
                  decoration: BoxDecoration(
                    color: const Color(0xEE14121F),
                    borderRadius: BorderRadius.circular(28),
                    border: Border.all(
                      color: AppColors.primary.withOpacity(0.4),
                      width: 1.5,
                    ),
                    boxShadow: [
                      BoxShadow(
                        color: AppColors.primary.withOpacity(0.3),
                        blurRadius: 30,
                        offset: const Offset(0, 10),
                      ),
                    ],
                  ),
                  child: Column(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      // Glowing Rocket Badge
                      Container(
                        width: 72,
                        height: 72,
                        decoration: BoxDecoration(
                          shape: BoxShape.circle,
                          gradient: AppColors.primaryGradient,
                          boxShadow: [
                            BoxShadow(
                              color: AppColors.primary.withOpacity(0.6),
                              blurRadius: 20,
                              offset: const Offset(0, 6),
                            ),
                          ],
                        ),
                        child: const Center(
                          child: Icon(
                            Icons.system_update_rounded,
                            color: Colors.white,
                            size: 38,
                          ),
                        ),
                      ),
                      const SizedBox(height: 18),

                      // Title
                      const Text(
                        "Yangi Yangilanish Mavjud! 🎉",
                        textAlign: TextAlign.center,
                        style: TextStyle(
                          color: Colors.white,
                          fontSize: 20,
                          fontWeight: FontWeight.w800,
                          letterSpacing: 0.3,
                        ),
                      ),
                      const SizedBox(height: 6),

                      // Version Badge
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 4),
                        decoration: BoxDecoration(
                          color: AppColors.primary.withOpacity(0.2),
                          borderRadius: BorderRadius.circular(20),
                          border: Border.all(color: AppColors.primary.withOpacity(0.4)),
                        ),
                        child: Text(
                          "v$currentVersionName  ➔  v${update.latestVersion}",
                          style: const TextStyle(
                            color: AppColors.primary,
                            fontSize: 13,
                            fontWeight: FontWeight.w700,
                          ),
                        ),
                      ),
                      const SizedBox(height: 16),

                      // Changelog container
                      Container(
                        width: double.infinity,
                        constraints: const BoxConstraints(maxHeight: 160),
                        padding: const EdgeInsets.all(14),
                        decoration: BoxDecoration(
                          color: Colors.black.withOpacity(0.35),
                          borderRadius: BorderRadius.circular(16),
                          border: Border.all(color: Colors.white.withOpacity(0.08)),
                        ),
                        child: SingleChildScrollView(
                          child: Text(
                            update.releaseNotes,
                            style: const TextStyle(
                              color: Colors.white70,
                              fontSize: 13,
                              height: 1.5,
                            ),
                          ),
                        ),
                      ),
                      const SizedBox(height: 22),

                      // Update CTA Button
                      GestureDetector(
                        onTap: () async {
                          final uri = Uri.parse(update.apkUrl);
                          if (await canLaunchUrl(uri)) {
                            await launchUrl(uri, mode: LaunchMode.externalApplication);
                          }
                          if (!update.forceUpdate && ctx.mounted) {
                            Navigator.of(ctx).pop();
                          }
                        },
                        child: Container(
                          width: double.infinity,
                          height: 50,
                          decoration: BoxDecoration(
                            gradient: AppColors.primaryGradient,
                            borderRadius: BorderRadius.circular(16),
                            boxShadow: [
                              BoxShadow(
                                color: AppColors.primary.withOpacity(0.5),
                                blurRadius: 16,
                                offset: const Offset(0, 5),
                              ),
                            ],
                          ),
                          child: const Center(
                            child: Row(
                              mainAxisAlignment: MainAxisAlignment.center,
                              children: [
                                Icon(Icons.download_rounded, color: Colors.white, size: 22),
                                SizedBox(width: 8),
                                Text(
                                  "Hozir Yangilash",
                                  style: TextStyle(
                                    color: Colors.white,
                                    fontSize: 15,
                                    fontWeight: FontWeight.w800,
                                    letterSpacing: 0.5,
                                  ),
                                ),
                              ],
                            ),
                          ),
                        ),
                      ),

                      // Later Button (If not force update)
                      if (!update.forceUpdate) ...[
                        const SizedBox(height: 10),
                        TextButton(
                          onPressed: () => Navigator.of(ctx).pop(),
                          child: const Text(
                            "Keyinroq yangilayman",
                            style: TextStyle(
                              color: AppColors.textMuted,
                              fontSize: 13,
                              fontWeight: FontWeight.w600,
                            ),
                          ),
                        ),
                      ],
                    ],
                  ),
                ),
              ),
            ),
          ),
        );
      },
    );
  }
}
