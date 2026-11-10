import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../core/constants/app_colors.dart';
import '../../providers/auth_provider.dart';
import '../../widgets/modern_text_field.dart';
import '../../widgets/neon_glow_button.dart';
import '../main_shell_screen.dart';

class EmailOtpScreen extends StatefulWidget {
  const EmailOtpScreen({super.key});

  @override
  State<EmailOtpScreen> createState() => _EmailOtpScreenState();
}

class _EmailOtpScreenState extends State<EmailOtpScreen> {
  // Step 1: input_email, Step 2: input_code, Step 3: input_details
  String _step = 'input_email';

  final TextEditingController _emailController = TextEditingController();
  final TextEditingController _codeController = TextEditingController();
  final TextEditingController _nameController = TextEditingController();
  final TextEditingController _passwordController = TextEditingController();

  bool _obscurePassword = true;

  @override
  void dispose() {
    _emailController.dispose();
    _codeController.dispose();
    _nameController.dispose();
    _passwordController.dispose();
    super.dispose();
  }

  void _onSuccessLogin() {
    Navigator.of(context).pushAndRemoveUntil(
      MaterialPageRoute(builder: (_) => const MainShellScreen()),
      (route) => false,
    );
  }

  @override
  Widget build(BuildContext context) {
    final auth = Provider.of<AuthProvider>(context);

    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(
        leading: IconButton(
          icon: const Icon(Icons.arrow_back_ios_new_rounded, color: Colors.white, size: 20),
          onPressed: () {
            if (_step == 'input_code') {
              setState(() => _step = 'input_email');
            } else if (_step == 'input_details') {
              setState(() => _step = 'input_code');
            } else {
              Navigator.of(context).pop();
            }
          },
        ),
        title: Text(
          _step == 'input_email' 
              ? "Email orqali kirish"
              : _step == 'input_code' 
                  ? "Tasdiqlash kodi" 
                  : "Akkauntni sozlash",
          style: const TextStyle(color: Colors.white, fontSize: 18, fontWeight: FontWeight.w700),
        ),
      ),
      body: SafeArea(
        child: SingleChildScrollView(
          padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 20),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              // Icon Header Box
              Center(
                child: Container(
                  width: 70,
                  height: 70,
                  decoration: BoxDecoration(
                    shape: BoxShape.circle,
                    color: AppColors.primary.withOpacity(0.12),
                    border: Border.all(color: AppColors.primary.withOpacity(0.3), width: 1.5),
                  ),
                  child: Center(
                    child: Icon(
                      _step == 'input_email' 
                          ? Icons.mail_rounded 
                          : _step == 'input_code' 
                              ? Icons.key_rounded 
                              : Icons.person_rounded,
                      color: AppColors.primary,
                      size: 32,
                    ),
                  ),
                ),
              ),
              const SizedBox(height: 20),

              // Title and Description
              Text(
                _step == 'input_email' 
                    ? "Emailingizni kiriting"
                    : _step == 'input_code' 
                        ? "Emailga kelgan kodni kiriting" 
                        : "Ismingiz va parolingiz",
                textAlign: TextAlign.center,
                style: const TextStyle(
                  color: Colors.white,
                  fontSize: 22,
                  fontWeight: FontWeight.w800,
                ),
              ),
              const SizedBox(height: 8),
              Text(
                _step == 'input_email'
                    ? "Kirish yoki yangi ro'yxatdan o'tish uchun pochtangizga bir martalik 6 xonali kod yuboramiz."
                    : _step == 'input_code'
                        ? "${_emailController.text} manziliga 6 xonali xavfsizlik kodi yuborildi."
                        : "Profil ma'lumotlarini to'ldiring.",
                textAlign: TextAlign.center,
                style: const TextStyle(
                  color: AppColors.textSecondary,
                  fontSize: 13,
                  height: 1.4,
                ),
              ),
              const SizedBox(height: 32),

              // Error or Success Banner
              if (auth.errorMessage != null) ...[
                Container(
                  padding: const EdgeInsets.all(12),
                  decoration: BoxDecoration(
                    color: AppColors.error.withOpacity(0.15),
                    borderRadius: BorderRadius.circular(12),
                    border: Border.all(color: AppColors.error.withOpacity(0.4)),
                  ),
                  child: Row(
                    children: [
                      const Icon(Icons.error_outline_rounded, color: AppColors.error, size: 20),
                      const SizedBox(width: 8),
                      Expanded(
                        child: Text(
                          auth.errorMessage!,
                          style: const TextStyle(color: AppColors.error, fontSize: 13),
                        ),
                      ),
                    ],
                  ),
                ),
                const SizedBox(height: 20),
              ],

              if (auth.successMessage != null) ...[
                Container(
                  padding: const EdgeInsets.all(12),
                  decoration: BoxDecoration(
                    color: AppColors.success.withOpacity(0.15),
                    borderRadius: BorderRadius.circular(12),
                    border: Border.all(color: AppColors.success.withOpacity(0.4)),
                  ),
                  child: Row(
                    children: [
                      const Icon(Icons.check_circle_outline_rounded, color: AppColors.success, size: 20),
                      const SizedBox(width: 8),
                      Expanded(
                        child: Text(
                          auth.successMessage!,
                          style: const TextStyle(color: AppColors.success, fontSize: 13),
                        ),
                      ),
                    ],
                  ),
                ),
                const SizedBox(height: 20),
              ],

              // STEP 1: Email Input
              if (_step == 'input_email') ...[
                ModernTextField(
                  controller: _emailController,
                  hintText: "masalan: animem@gmail.com",
                  labelText: "Email manzil (Gmail)",
                  keyboardType: TextInputType.emailAddress,
                  prefixIcon: const Icon(Icons.mail_outline_rounded, color: AppColors.textMuted),
                ),
                const SizedBox(height: 24),
                NeonGlowButton(
                  text: "Tasdiqlash kodini yuborish",
                  isLoading: auth.isLoading,
                  onPressed: () async {
                    final email = _emailController.text.trim();
                    if (email.isEmpty || !email.contains('@')) {
                      ScaffoldMessenger.of(context).showSnackBar(
                        const SnackBar(content: Text("Iltimos, to'g'ri email manzilini kiriting!")),
                      );
                      return;
                    }
                    final ok = await auth.sendEmailOtp(email);
                    if (ok) {
                      setState(() => _step = 'input_code');
                    }
                  },
                ),
              ],

              // STEP 2: Code Verification
              if (_step == 'input_code') ...[
                ModernTextField(
                  controller: _codeController,
                  hintText: "6 xonali kod (masalan: 123456)",
                  labelText: "Tasdiqlash kodi",
                  keyboardType: TextInputType.number,
                  prefixIcon: const Icon(Icons.key_rounded, color: AppColors.textMuted),
                ),
                const SizedBox(height: 20),
                NeonGlowButton(
                  text: "Kodni tasdiqlash",
                  isLoading: auth.isLoading,
                  onPressed: () async {
                    final code = _codeController.text.trim();
                    if (code.length != 6) {
                      ScaffoldMessenger.of(context).showSnackBar(
                        const SnackBar(content: Text("Iltimos, 6 xonali kodni kiriting!")),
                      );
                      return;
                    }

                    final ok = await auth.verifyEmailOtp(_emailController.text, code);
                    if (ok) {
                      if (auth.isAuthenticated) {
                        _onSuccessLogin();
                      } else {
                        setState(() => _step = 'input_details');
                      }
                    }
                  },
                ),
                const SizedBox(height: 20),

                // Resend Countdown
                Center(
                  child: auth.canResendOtp
                      ? TextButton(
                          onPressed: () {
                            auth.sendEmailOtp(_emailController.text);
                          },
                          child: const Text(
                            "Kodni qayta yuborish",
                            style: TextStyle(color: AppColors.accentCyan, fontWeight: FontWeight.w600),
                          ),
                        )
                      : Text(
                          "Kodni qayta yuborish (${auth.otpCountdown}s)",
                          style: const TextStyle(color: AppColors.textMuted, fontSize: 13),
                        ),
                ),
              ],

              // STEP 3: Complete New User Details
              if (_step == 'input_details') ...[
                ModernTextField(
                  controller: _nameController,
                  hintText: "Ismingiz yoki taxallusingiz",
                  labelText: "Ism / Nikneym",
                  prefixIcon: const Icon(Icons.person_outline_rounded, color: AppColors.textMuted),
                ),
                const SizedBox(height: 16),
                ModernTextField(
                  controller: _passwordController,
                  hintText: "Kamida 6 ta belgi",
                  labelText: "Parol yarating",
                  obscureText: _obscurePassword,
                  prefixIcon: const Icon(Icons.lock_outline_rounded, color: AppColors.textMuted),
                  suffixIcon: IconButton(
                    icon: Icon(
                      _obscurePassword ? Icons.visibility_off_outlined : Icons.visibility_outlined,
                      color: AppColors.textMuted,
                    ),
                    onPressed: () => setState(() => _obscurePassword = !_obscurePassword),
                  ),
                ),
                const SizedBox(height: 24),
                NeonGlowButton(
                  text: "Ro'yxatdan o'tishni yakunlash",
                  isLoading: auth.isLoading,
                  onPressed: () async {
                    final name = _nameController.text.trim();
                    final pass = _passwordController.text;

                    if (name.isEmpty) {
                      ScaffoldMessenger.of(context).showSnackBar(
                        const SnackBar(content: Text("Iltimos, ismingizni kiriting!")),
                      );
                      return;
                    }
                    if (pass.length < 6) {
                      ScaffoldMessenger.of(context).showSnackBar(
                        const SnackBar(content: Text("Parol kamida 6 ta belgidan iborat bo'lsin!")),
                      );
                      return;
                    }

                    final ok = await auth.completeRegistration(
                      name: name,
                      email: _emailController.text,
                      password: pass,
                      code: _codeController.text,
                    );
                    if (ok) {
                      _onSuccessLogin();
                    }
                  },
                ),
              ],
            ],
          ),
        ),
      ),
    );
  }
}
