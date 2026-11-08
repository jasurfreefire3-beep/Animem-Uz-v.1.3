import 'dart:convert';
import 'package:dio/dio.dart';
import 'package:shared_preferences/shared_preferences.dart';
import '../constants/api_constants.dart';
import '../../models/anime_model.dart';
import '../../models/fandub_model.dart';
import '../../models/reel_model.dart';

class ApiService {
  static final ApiService _instance = ApiService._internal();
  factory ApiService() => _instance;

  late Dio _dio;

  ApiService._internal() {
    _dio = Dio(BaseOptions(
      baseUrl: ApiConstants.baseUrl,
      connectTimeout: const Duration(seconds: 15),
      receiveTimeout: const Duration(seconds: 15),
      headers: {
        'Accept': 'application/json',
        'x-client-app': 'animem-flutter-mobile',
      },
    ));

    _dio.interceptors.add(InterceptorsWrapper(
      onRequest: (options, handler) async {
        final prefs = await SharedPreferences.getInstance();
        final token = prefs.getString('auth_token');
        if (token != null && token.isNotEmpty) {
          options.headers['Authorization'] = 'Bearer $token';
        }
        return handler.next(options);
      },
      onError: (DioException e, handler) {
        return handler.next(e);
      },
    ));
  }

  // --- 1. AUTHENTICATION ---

  /// Request 6-digit OTP code to Gmail/Email
  Future<Map<String, dynamic>> sendEmailOtp(String email) async {
    try {
      final res = await _dio.post(ApiConstants.sendEmailCode, data: {
        'email': email.trim().toLowerCase(),
        'isLogin': true,
      });
      return res.data is Map<String, dynamic> ? res.data : jsonDecode(res.data);
    } on DioException catch (e) {
      final errorMsg = e.response?.data?['error'] ?? "Kodni yuborib bo'lmadi";
      throw Exception(errorMsg);
    }
  }

  /// Verify 6-digit OTP code (Instant login if user exists)
  Future<Map<String, dynamic>> verifyEmailOtp(String email, String code) async {
    try {
      final res = await _dio.post(ApiConstants.verifyEmailCode, data: {
        'email': email.trim().toLowerCase(),
        'code': code.trim(),
      });
      return res.data is Map<String, dynamic> ? res.data : jsonDecode(res.data);
    } on DioException catch (e) {
      final errorMsg = e.response?.data?['error'] ?? "Tasdiqlash kodi xato";
      throw Exception(errorMsg);
    }
  }

  /// Complete Registration with verified code
  Future<Map<String, dynamic>> registerVerified({
    required String name,
    required String email,
    required String password,
    required String code,
  }) async {
    try {
      final res = await _dio.post(ApiConstants.registerVerified, data: {
        'name': name.trim(),
        'email': email.trim().toLowerCase(),
        'password': password,
        'code': code.trim(),
      });
      return res.data is Map<String, dynamic> ? res.data : jsonDecode(res.data);
    } on DioException catch (e) {
      final errorMsg = e.response?.data?['error'] ?? "Ro'yxatdan o'tishda xatolik";
      throw Exception(errorMsg);
    }
  }

  /// Standard Email/Password login
  Future<Map<String, dynamic>> loginWithPassword(String email, String password) async {
    try {
      final res = await _dio.post(ApiConstants.loginWithPassword, data: {
        'email': email.trim().toLowerCase(),
        'password': password,
      });
      return res.data is Map<String, dynamic> ? res.data : jsonDecode(res.data);
    } on DioException catch (e) {
      final errorMsg = e.response?.data?['error'] ?? "Email yoki parol xato";
      throw Exception(errorMsg);
    }
  }

  /// Create fresh Telegram session ID
  Future<String> getTelegramSession() async {
    try {
      final res = await _dio.get(ApiConstants.telegramSession);
      return res.data['sessionId'] ?? "auth_${DateTime.now().millisecondsSinceEpoch}";
    } catch (_) {
      return "auth_${DateTime.now().millisecondsSinceEpoch}";
    }
  }

  /// Check Telegram authorization status
  Future<Map<String, dynamic>> checkTelegramStatus(String sessionId) async {
    try {
      final res = await _dio.get("${ApiConstants.telegramStatus}/$sessionId");
      return res.data is Map<String, dynamic> ? res.data : jsonDecode(res.data);
    } catch (_) {
      return {'status': 'pending'};
    }
  }

  // --- 2. ANIME CATALOGUE ---

  Future<List<AnimeModel>> fetchAnimes() async {
    try {
      final res = await _dio.get(ApiConstants.animes);
      final List list = res.data is List ? res.data : (res.data['animes'] ?? []);
      return list.map((item) => AnimeModel.fromJson(item)).toList();
    } catch (e) {
      // Fallback with rich default data if offline or loading
      return _getFallbackAnimes();
    }
  }

  Future<AnimeModel?> fetchAnimeDetails(int id) async {
    try {
      final res = await _dio.get("${ApiConstants.animes}/$id");
      return AnimeModel.fromJson(res.data);
    } catch (e) {
      final list = _getFallbackAnimes();
      return list.firstWhere((a) => a.id == id, orElse: () => list.first);
    }
  }

  // --- 3. FANDUB TEAMS ---

  Future<List<FandubModel>> fetchFandubs() async {
    try {
      final res = await _dio.get(ApiConstants.fandubs);
      final List list = res.data is List ? res.data : (res.data['fandubs'] ?? []);
      return list.map((item) => FandubModel.fromJson(item)).toList();
    } catch (e) {
      return _getFallbackFandubs();
    }
  }

  Future<bool> toggleFandubSubscription(int id) async {
    try {
      final res = await _dio.post("${ApiConstants.fandubs}/$id/subscribe");
      return res.data['isSubscribed'] == true;
    } catch (_) {
      return true;
    }
  }

  // --- 4. REELS (SHORTS) ---

  Future<List<ReelModel>> fetchReels() async {
    try {
      final res = await _dio.get(ApiConstants.reels);
      final List list = res.data is List ? res.data : (res.data['reels'] ?? []);
      return list.map((item) => ReelModel.fromJson(item)).toList();
    } catch (e) {
      return _getFallbackReels();
    }
  }

  Future<bool> likeReel(int id) async {
    try {
      final res = await _dio.post("${ApiConstants.reels}/$id/like");
      return res.data['isLiked'] == true;
    } catch (_) {
      return true;
    }
  }

  Future<bool> uploadReel(String filePath, String title) async {
    try {
      FormData formData = FormData.fromMap({
        'title': title,
        'video': await MultipartFile.fromFile(filePath),
      });
      final res = await _dio.post(ApiConstants.reelsUpload, data: formData);
      return res.statusCode == 200 || res.statusCode == 201;
    } catch (_) {
      return false;
    }
  }

  // --- 5. PROFILE UPLOADS (CATBOX) ---

  Future<String?> uploadAvatar(String filePath) async {
    try {
      FormData formData = FormData.fromMap({
        'avatar': await MultipartFile.fromFile(filePath),
      });
      final res = await _dio.post(ApiConstants.uploadAvatar, data: formData);
      return res.data['avatar_url'];
    } catch (_) {
      return null;
    }
  }

  Future<String?> uploadBanner(String filePath) async {
    try {
      FormData formData = FormData.fromMap({
        'banner': await MultipartFile.fromFile(filePath),
      });
      final res = await _dio.post(ApiConstants.uploadBanner, data: formData);
      return res.data['banner_url'];
    } catch (_) {
      return null;
    }
  }

  // Fallback Rich Data
  List<AnimeModel> _getFallbackAnimes() {
    return [
      AnimeModel(
        id: 1,
        title: "Solo Leveling (Yolg'iz Daraja Ko'tarish)",
        originalTitle: "Ore dake Level Up na Ken",
        posterUrl: "https://image.animem.uz/api/media/img_1792172361943_kkah81l.jpg",
        bannerUrl: "https://images.unsplash.com/photo-1578632767115-351597cf2477?w=1600&auto=format&fit=crop&q=80",
        description: "Insoniyatning eng zaif ovchisi Son Jin-Vu g'aroyib yer osti zindonidagi sinovdan so'ng cheksiz daraja ko'tarish sirli kuchiga ega bo'ladi.",
        rating: 9.8,
        releaseYear: 2024,
        genres: ["Ekshn", "Fentezi", "Sarguzasht"],
        status: "Davom etmoqda",
        type: "TV Serial",
        studio: "A-1 Pictures",
        voiceActing: "Animem Uz Dublaj (Professional)",
        totalEpisodes: 12,
        viewsCount: 184500,
        isTrending: true,
        isFeatured: true,
        episodes: [
          EpisodeModel(episodeNumber: 1, title: "1-qism: Men o'rganishim kerak", videoUrl: "https://archive.org/download/BigBuckBunny_124/Content/big_buck_bunny_720p_surround.mp4"),
          EpisodeModel(episodeNumber: 2, title: "2-qism: Ikkilamchi uyg'onish", videoUrl: "https://archive.org/download/BigBuckBunny_124/Content/big_buck_bunny_720p_surround.mp4"),
          EpisodeModel(episodeNumber: 3, title: "3-qism: Qasamyod", videoUrl: "https://archive.org/download/BigBuckBunny_124/Content/big_buck_bunny_720p_surround.mp4"),
        ],
      ),
      AnimeModel(
        id: 2,
        title: "Jujutsu Kaisen: Sehrli Jang",
        originalTitle: "Jujutsu Kaisen Season 2",
        posterUrl: "https://images.unsplash.com/photo-1607604276583-eef5d076aa5f?w=600&auto=format&fit=crop&q=80",
        bannerUrl: "https://images.unsplash.com/photo-1534447677768-be436bb09401?w=1600&auto=format&fit=crop&q=80",
        description: "Satoru Gojo va Suguru Getoning o'tmishi hamda afsonaviy Shibuya hodisasi.",
        rating: 9.7,
        releaseYear: 2023,
        genres: ["Ekshn", "G'ayritabiiy", "Shonen"],
        status: "Tugallangan",
        type: "TV Serial",
        studio: "MAPPA",
        voiceActing: "Animem Dub",
        totalEpisodes: 23,
        viewsCount: 230400,
        isTrending: true,
        isFeatured: true,
        episodes: [
          EpisodeModel(episodeNumber: 1, title: "1-qism: Yashirin orzu", videoUrl: "https://archive.org/download/BigBuckBunny_124/Content/big_buck_bunny_720p_surround.mp4"),
        ],
      ),
    ];
  }

  List<FandubModel> _getFallbackFandubs() {
    return [
      FandubModel(
        id: 1,
        name: "Animem Dub",
        slug: "animem-dub",
        logoUrl: "https://api.animem.uz/api/images/1788100529230_au9wggu",
        description: "Animem.uz platformasining rasmiy ovoz yozish studiyasi. Faqat eng sara va sifatli tarjimalar.",
        subscribersCount: 24500,
        isSubscribed: true,
        membersCount: 8,
        tgChannel: "@AnimemDub",
      ),
      FandubModel(
        id: 2,
        name: "Amedia Uz",
        slug: "amedia",
        logoUrl: "https://images.unsplash.com/photo-1563089145-599997674d42?w=400&auto=format&fit=crop&q=80",
        description: "Tezkor va professional ovozlashtirish jamoasi.",
        subscribersCount: 18300,
        isSubscribed: false,
        membersCount: 6,
        tgChannel: "@AmediaUz",
      ),
    ];
  }

  List<ReelModel> _getFallbackReels() {
    return [
      ReelModel(
        id: 1,
        title: "Solo Leveling: Jin-Vu ning uyg'onish sahnasi 🔥",
        videoUrl: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4",
        authorName: "OtakuUz",
        authorAvatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&auto=format&fit=crop&q=80",
        likesCount: 1420,
        commentsCount: 89,
        isLiked: false,
      ),
      ReelModel(
        id: 2,
        title: "Gojo Satoru eng zo'r lahzasi ⚡️",
        videoUrl: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4",
        authorName: "AnimeKing",
        authorAvatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&auto=format&fit=crop&q=80",
        likesCount: 2890,
        commentsCount: 154,
        isLiked: true,
      ),
    ];
  }
}
