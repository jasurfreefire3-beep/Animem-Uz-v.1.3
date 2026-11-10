class ApiConstants {
  // Main Live Backend API Base
  static const String baseUrl = 'https://animem-uz-jasurfreefire3.wasmer.app';
  static const String fallbackUrl = 'https://animem.uz';
  
  // Telegram Bot Info
  static const String telegramBotUsername = 'Animem_uz_bot';
  static const String telegramBotUrl = 'https://t.me/Animem_uz_bot';

  // Auth Endpoints
  static const String sendEmailCode = '/api/auth/send-code';
  static const String verifyEmailCode = '/api/auth/verify-code';
  static const String registerVerified = '/api/auth/register-verified';
  static const String loginWithPassword = '/api/auth/login';
  static const String telegramSession = '/api/auth/telegram/session';
  static const String telegramStatus = '/api/auth/telegram/status';

  // Content Endpoints
  static const String animes = '/api/animes';
  static const String trendingAnimes = '/api/animes/trending';
  static const String fandubs = '/api/fandubs';
  static const String reels = '/api/reels';
  static const String reelsUpload = '/api/reels/upload';
  
  // User & Profile
  static const String userProfile = '/api/user/profile';
  static const String uploadAvatar = '/api/user/avatar';
  static const String uploadBanner = '/api/user/banner';
  static const String watchHistory = '/api/user/history';
  static const String favorites = '/api/user/favorites';

  // Socket Live Chat URL
  static const String socketUrl = 'https://animem-uz-jasurfreefire3.wasmer.app';
}
