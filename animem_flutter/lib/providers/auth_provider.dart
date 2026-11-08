import 'dart:async';
import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:url_launcher/url_launcher.dart';
import '../core/constants/api_constants.dart';
import '../core/network/api_service.dart';
import '../models/user_model.dart';

class AuthProvider extends ChangeNotifier {
  final ApiService _api = ApiService();

  UserModel? _user;
  String? _token;
  bool _isGuest = false;
  bool _isLoading = false;
  String? _errorMessage;
  String? _successMessage;

  // OTP State
  int _otpCountdown = 60;
  Timer? _countdownTimer;
  bool _canResendOtp = false;

  // Telegram polling
  Timer? _tgPollTimer;
  String? _tgSessionId;

  UserModel? get user => _user;
  String? get token => _token;
  bool get isAuthenticated => _user != null && _token != null;
  bool get isGuest => _isGuest;
  bool get isLoading => _isLoading;
  String? get errorMessage => _errorMessage;
  String? get successMessage => _successMessage;
  int get otpCountdown => _otpCountdown;
  bool get canResendOtp => _canResendOtp;
  String? get tgSessionId => _tgSessionId;

  AuthProvider() {
    _loadUserFromStorage();
  }

  Future<void> _loadUserFromStorage() async {
    final prefs = await SharedPreferences.getInstance();
    _token = prefs.getString('auth_token');
    final userJson = prefs.getString('auth_user');
    _isGuest = prefs.getBool('is_guest') ?? false;

    if (userJson != null && userJson.isNotEmpty) {
      try {
        _user = UserModel.fromJson(jsonDecode(userJson));
      } catch (_) {}
    }
    notifyListeners();
  }

  void continueAsGuest() async {
    _isGuest = true;
    _user = null;
    final prefs = await SharedPreferences.getInstance();
    await prefs.setBool('is_guest', true);
    notifyListeners();
  }

  void clearMessages() {
    _errorMessage = null;
    _successMessage = null;
    notifyListeners();
  }

  // --- EMAIL OTP AUTHENTICATION ---

  Future<bool> sendEmailOtp(String email) async {
    _isLoading = true;
    _errorMessage = null;
    _successMessage = null;
    notifyListeners();

    try {
      final res = await _api.sendEmailOtp(email);
      _isLoading = false;
      _successMessage = res['message'] ?? "Tasdiqlash kodi emailingizga yuborildi!";
      _startOtpTimer();
      notifyListeners();
      return true;
    } catch (e) {
      _isLoading = false;
      _errorMessage = e.toString().replaceAll('Exception: ', '');
      notifyListeners();
      return false;
    }
  }

  void _startOtpTimer() {
    _otpCountdown = 60;
    _canResendOtp = false;
    _countdownTimer?.cancel();
    _countdownTimer = Timer.periodic(const Duration(seconds: 1), (timer) {
      if (_otpCountdown > 0) {
        _otpCountdown--;
        notifyListeners();
      } else {
        _canResendOtp = true;
        timer.cancel();
        notifyListeners();
      }
    });
  }

  Future<bool> verifyEmailOtp(String email, String code) async {
    _isLoading = true;
    _errorMessage = null;
    notifyListeners();

    try {
      final res = await _api.verifyEmailOtp(email, code);
      _isLoading = false;

      // If user exists: Instant 1-Click Login!
      if (res['userExists'] == true && res['token'] != null && res['user'] != null) {
        await _saveAuthData(res['token'], res['user']);
        _successMessage = "Muvaffaqiyatli kirdingiz!";
        notifyListeners();
        return true;
      }

      // New user needing name & password
      _successMessage = "Kod to'g'ri tasdiqlandi!";
      notifyListeners();
      return true;
    } catch (e) {
      _isLoading = false;
      _errorMessage = e.toString().replaceAll('Exception: ', '');
      notifyListeners();
      return false;
    }
  }

  Future<bool> completeRegistration({
    required String name,
    required String email,
    required String password,
    required String code,
  }) async {
    _isLoading = true;
    _errorMessage = null;
    notifyListeners();

    try {
      final res = await _api.registerVerified(
        name: name,
        email: email,
        password: password,
        code: code,
      );
      _isLoading = false;

      if (res['token'] != null && res['user'] != null) {
        await _saveAuthData(res['token'], res['user']);
        _successMessage = "Akkauntingiz yaratildi! Xush kelibsiz!";
        notifyListeners();
        return true;
      }
      return false;
    } catch (e) {
      _isLoading = false;
      _errorMessage = e.toString().replaceAll('Exception: ', '');
      notifyListeners();
      return false;
    }
  }

  // --- TELEGRAM 1-TAP LOGIN ---

  Future<void> startTelegramLogin() async {
    _isLoading = true;
    _errorMessage = null;
    notifyListeners();

    try {
      final sessionId = await _api.getTelegramSession();
      _tgSessionId = sessionId;

      // Telegram Deep Link directly opens the Telegram app!
      final tgDeepLink = Uri.parse("tg://resolve?domain=${ApiConstants.telegramBotUsername}&start=$sessionId");
      final tgWebLink = Uri.parse("${ApiConstants.telegramBotUrl}?start=$sessionId");

      _isLoading = false;
      notifyListeners();

      if (await canLaunchUrl(tgDeepLink)) {
        await launchUrl(tgDeepLink, mode: LaunchMode.externalApplication);
      } else {
        await launchUrl(tgWebLink, mode: LaunchMode.externalApplication);
      }

      // Start Polling for Telegram approval
      _startTelegramPolling(sessionId);
    } catch (e) {
      _isLoading = false;
      _errorMessage = "Telegramga ulanishda xatolik yuz berdi";
      notifyListeners();
    }
  }

  void _startTelegramPolling(String sessionId) {
    _tgPollTimer?.cancel();
    int attempts = 0;
    const maxAttempts = 150; // 5 minutes

    _tgPollTimer = Timer.periodic(const Duration(seconds: 2), (timer) async {
      attempts++;
      if (attempts >= maxAttempts) {
        timer.cancel();
        return;
      }

      try {
        final res = await _api.checkTelegramStatus(sessionId);
        if (res['status'] == 'authorized' && res['token'] != null && res['user'] != null) {
          timer.cancel();
          await _saveAuthData(res['token'], res['user']);
          _successMessage = "Telegram orqali muvaffaqiyatli kirdingiz!";
          notifyListeners();
        }
      } catch (_) {}
    });
  }

  Future<void> _saveAuthData(String token, dynamic userMap) async {
    _token = token;
    _user = UserModel.fromJson(userMap is Map<String, dynamic> ? userMap : jsonDecode(userMap));
    _isGuest = false;

    final prefs = await SharedPreferences.getInstance();
    await prefs.setString('auth_token', token);
    await prefs.setString('auth_user', jsonEncode(_user!.toJson()));
    await prefs.setBool('is_guest', false);
    notifyListeners();
  }

  Future<void> updateAvatar(String imageUrl) async {
    if (_user != null) {
      _user = _user!.copyWith(avatarUrl: imageUrl);
      final prefs = await SharedPreferences.getInstance();
      await prefs.setString('auth_user', jsonEncode(_user!.toJson()));
      notifyListeners();
    }
  }

  Future<void> updateBanner(String imageUrl) async {
    if (_user != null) {
      _user = _user!.copyWith(bannerUrl: imageUrl);
      final prefs = await SharedPreferences.getInstance();
      await prefs.setString('auth_user', jsonEncode(_user!.toJson()));
      notifyListeners();
    }
  }

  Future<void> logout() async {
    _user = null;
    _token = null;
    _isGuest = false;
    _tgPollTimer?.cancel();
    _countdownTimer?.cancel();

    final prefs = await SharedPreferences.getInstance();
    await prefs.remove('auth_token');
    await prefs.remove('auth_user');
    await prefs.remove('is_guest');
    notifyListeners();
  }

  @override
  void dispose() {
    _tgPollTimer?.cancel();
    _countdownTimer?.cancel();
    super.dispose();
  }
}
