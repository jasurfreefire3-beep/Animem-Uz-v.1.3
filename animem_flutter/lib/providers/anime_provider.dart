import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:shared_preferences/shared_preferences.dart';
import '../core/network/api_service.dart';
import '../models/anime_model.dart';

class AnimeProvider extends ChangeNotifier {
  final ApiService _api = ApiService();

  List<AnimeModel> _animes = [];
  bool _isLoading = false;
  String _searchQuery = '';
  String _selectedGenre = 'Barchasi';

  // Local storage for Favorites & Watch History
  final Set<int> _favoriteIds = {};
  final Map<int, int> _watchProgress = {}; // animeId -> episodeNumber

  List<AnimeModel> get animes => _animes;
  bool get isLoading => _isLoading;
  String get searchQuery => _searchQuery;
  String get selectedGenre => _selectedGenre;

  List<AnimeModel> get featuredAnimes => 
      _animes.where((a) => a.isFeatured || a.rating >= 9.0).take(5).toList();

  List<AnimeModel> get trendingAnimes => 
      _animes.where((a) => a.isTrending).toList();

  List<AnimeModel> get filteredAnimes {
    return _animes.where((anime) {
      final matchesSearch = _searchQuery.isEmpty || 
          anime.title.toLowerCase().contains(_searchQuery.toLowerCase()) ||
          (anime.originalTitle?.toLowerCase().contains(_searchQuery.toLowerCase()) ?? false);

      final matchesGenre = _selectedGenre == 'Barchasi' || 
          anime.genres.contains(_selectedGenre);

      return matchesSearch && matchesGenre;
    }).toList();
  }

  List<AnimeModel> get favoriteAnimes => 
      _animes.where((a) => _favoriteIds.contains(a.id)).toList();

  AnimeProvider() {
    loadLocalData();
    fetchAnimes();
  }

  Future<void> loadLocalData() async {
    final prefs = await SharedPreferences.getInstance();
    final favList = prefs.getStringList('favorite_anime_ids') ?? [];
    _favoriteIds.addAll(favList.map((id) => int.tryParse(id) ?? 0).where((id) => id > 0));

    final historyJson = prefs.getString('anime_watch_progress');
    if (historyJson != null) {
      try {
        final Map<String, dynamic> map = jsonDecode(historyJson);
        map.forEach((k, v) {
          final animeId = int.tryParse(k);
          final ep = int.tryParse(v.toString());
          if (animeId != null && ep != null) {
            _watchProgress[animeId] = ep;
          }
        });
      } catch (_) {}
    }
    notifyListeners();
  }

  Future<void> fetchAnimes() async {
    _isLoading = true;
    notifyListeners();

    _animes = await _api.fetchAnimes();
    _isLoading = false;
    notifyListeners();
  }

  void setSearchQuery(String query) {
    _searchQuery = query;
    notifyListeners();
  }

  void setSelectedGenre(String genre) {
    _selectedGenre = genre;
    notifyListeners();
  }

  bool isFavorite(int animeId) => _favoriteIds.contains(animeId);

  Future<void> toggleFavorite(int animeId) async {
    if (_favoriteIds.contains(animeId)) {
      _favoriteIds.remove(animeId);
    } else {
      _favoriteIds.add(animeId);
    }
    notifyListeners();

    final prefs = await SharedPreferences.getInstance();
    await prefs.setStringList('favorite_anime_ids', _favoriteIds.map((id) => id.toString()).toList());
  }

  int getWatchProgress(int animeId) => _watchProgress[animeId] ?? 1;

  Future<void> saveWatchProgress(int animeId, int episode) async {
    _watchProgress[animeId] = episode;
    notifyListeners();

    final prefs = await SharedPreferences.getInstance();
    await prefs.setString('anime_watch_progress', jsonEncode(
      _watchProgress.map((k, v) => MapEntry(k.toString(), v))
    ));
  }
}
