import 'package:flutter/material.dart';
import '../core/network/api_service.dart';
import '../models/reel_model.dart';

class ReelsProvider extends ChangeNotifier {
  final ApiService _api = ApiService();

  List<ReelModel> _reels = [];
  bool _isLoading = false;
  int _currentIndex = 0;

  List<ReelModel> get reels => _reels;
  bool get isLoading => _isLoading;
  int get currentIndex => _currentIndex;

  ReelsProvider() {
    fetchReels();
  }

  Future<void> fetchReels() async {
    _isLoading = true;
    notifyListeners();

    try {
      _reels = await _api.fetchReels();
    } catch (e) {
      debugPrint("Error fetching reels: $e");
    } finally {
      _isLoading = false;
      notifyListeners();
    }
  }

  void setCurrentIndex(int index) {
    _currentIndex = index;
    notifyListeners();
  }

  Future<void> toggleLike(int reelId) async {
    final index = _reels.indexWhere((r) => r.id == reelId);
    if (index == -1) return;

    final current = _reels[index];
    final newIsLiked = !current.isLiked;
    final newCount = newIsLiked ? current.likesCount + 1 : current.likesCount - 1;

    // Optimistic UI update
    _reels[index] = current.copyWith(
      isLiked: newIsLiked,
      likesCount: newCount > 0 ? newCount : 0,
    );
    notifyListeners();

    // Sync with backend API
    await _api.likeReel(reelId);
  }

  Future<bool> uploadReel(String filePath, String title) async {
    final success = await _api.uploadReel(filePath, title);
    if (success) {
      await fetchReels();
    }
    return success;
  }
}
