import 'package:flutter/material.dart';
import '../core/network/api_service.dart';
import '../models/fandub_model.dart';

class FandubProvider extends ChangeNotifier {
  final ApiService _api = ApiService();

  List<FandubModel> _fandubs = [];
  bool _isLoading = false;

  List<FandubModel> get fandubs => _fandubs;
  bool get isLoading => _isLoading;

  FandubProvider() {
    fetchFandubs();
  }

  Future<void> fetchFandubs() async {
    _isLoading = true;
    notifyListeners();

    try {
      _fandubs = await _api.fetchFandubs();
    } catch (e) {
      debugPrint("Error fetching fandubs: $e");
    } finally {
      _isLoading = false;
      notifyListeners();
    }
  }

  Future<void> toggleSubscription(int fandubId) async {
    final index = _fandubs.indexWhere((f) => f.id == fandubId);
    if (index == -1) return;

    final current = _fandubs[index];
    final newSubStatus = !current.isSubscribed;
    final newCount = newSubStatus ? current.subscribersCount + 1 : current.subscribersCount - 1;

    // Optimistic UI update
    _fandubs[index] = current.copyWith(
      isSubscribed: newSubStatus,
      subscribersCount: newCount > 0 ? newCount : 0,
    );
    notifyListeners();

    // Sync with backend API
    await _api.toggleFandubSubscription(fandubId);
  }
}
