import 'episode_model.dart';

class AnimeModel {
  final int id;
  final String title;
  final String? originalTitle;
  final String posterUrl;
  final String? bannerUrl;
  final String description;
  final double rating;
  final int releaseYear;
  final List<String> genres;
  final String status;
  final String type;
  final String? studio;
  final String? voiceActing;
  final int totalEpisodes;
  final int viewsCount;
  final bool isTrending;
  final bool isFeatured;
  final List<EpisodeModel> episodes;

  AnimeModel({
    required this.id,
    required this.title,
    this.originalTitle,
    required this.posterUrl,
    this.bannerUrl,
    required this.description,
    required this.rating,
    required this.releaseYear,
    required this.genres,
    required this.status,
    required this.type,
    this.studio,
    this.voiceActing,
    required this.totalEpisodes,
    required this.viewsCount,
    this.isTrending = false,
    this.isFeatured = false,
    this.episodes = const [],
  });

  factory AnimeModel.fromJson(Map<String, dynamic> json) {
    var rawGenres = json['genres'];
    List<String> parsedGenres = [];
    if (rawGenres is List) {
      parsedGenres = rawGenres.map((e) => e.toString()).toList();
    } else if (rawGenres is String) {
      parsedGenres = rawGenres.split(',').map((e) => e.trim()).where((e) => e.isNotEmpty).toList();
    }

    var rawEpisodes = json['episodes'];
    List<EpisodeModel> parsedEpisodes = [];
    if (rawEpisodes is List) {
      parsedEpisodes = rawEpisodes.map((e) => EpisodeModel.fromJson(e as Map<String, dynamic>)).toList();
    }

    // Double rating parsing safely
    double parsedRating = 8.5;
    if (json['rating'] != null) {
      parsedRating = double.tryParse(json['rating'].toString()) ?? 8.5;
    }

    int parsedViews = 0;
    if (json['views_count'] != null || json['korishlar'] != null) {
      parsedViews = int.tryParse((json['views_count'] ?? json['korishlar']).toString()) ?? 0;
    }

    return AnimeModel(
      id: json['id'] is int ? json['id'] : int.tryParse(json['id']?.toString() ?? '0') ?? 0,
      title: json['title'] ?? 'Noma\'lum Anime',
      originalTitle: json['original_title'],
      posterUrl: json['poster_url'] ?? json['image_url'] ?? 'https://api.animem.uz/api/images/1788100529230_au9wggu',
      bannerUrl: json['banner_url'] ?? json['poster_url'] ?? json['image_url'],
      description: json['description'] ?? 'Tavsif berilmagan.',
      rating: parsedRating,
      releaseYear: int.tryParse(json['release_year']?.toString() ?? '2024') ?? 2024,
      genres: parsedGenres.isNotEmpty ? parsedGenres : ['Anime', 'O\'zbekcha'],
      status: json['status'] ?? 'Davom etmoqda',
      type: json['type'] ?? 'TV Serial',
      studio: json['studio'],
      voiceActing: json['voice_acting'] ?? json['dub_author'] ?? 'Animem Uz Dublaj',
      totalEpisodes: int.tryParse(json['total_episodes']?.toString() ?? '12') ?? 12,
      viewsCount: parsedViews,
      isTrending: json['is_trending'] == true || json['is_trending'] == 1,
      isFeatured: json['is_featured'] == true || json['is_featured'] == 1,
      episodes: parsedEpisodes,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'title': title,
      'original_title': originalTitle,
      'poster_url': posterUrl,
      'banner_url': bannerUrl,
      'description': description,
      'rating': rating,
      'release_year': releaseYear,
      'genres': genres,
      'status': status,
      'type': type,
      'studio': studio,
      'voice_acting': voiceActing,
      'total_episodes': totalEpisodes,
      'views_count': viewsCount,
      'is_trending': isTrending,
      'is_featured': isFeatured,
      'episodes': episodes.map((e) => e.toJson()).toList(),
    };
  }
}
