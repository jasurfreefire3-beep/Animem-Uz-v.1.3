import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:image_picker/image_picker.dart';
import 'package:provider/provider.dart';
import '../../core/constants/app_colors.dart';
import '../../core/network/api_service.dart';
import '../../providers/anime_provider.dart';
import '../../providers/auth_provider.dart';
import '../../widgets/anime_card.dart';
import '../../widgets/cached_image_view.dart';
import '../../widgets/liquid_glass_container.dart';
import '../auth/auth_gate_screen.dart';
import '../details/anime_details_screen.dart';

class ProfileScreen extends StatefulWidget {
  const ProfileScreen({super.key});

  @override
  State<ProfileScreen> createState() => _ProfileScreenState();
}

class _ProfileScreenState extends State<ProfileScreen> with SingleTickerProviderStateMixin {
  late TabController _tabController;
  final ApiService _api = ApiService();
  bool _isUploading = false;

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 2, vsync: this);
  }

  @override
  void dispose() {
    _tabController.dispose();
    super.dispose();
  }

  void _pickAndUploadAvatar(AuthProvider auth) async {
    final picker = ImagePicker();
    final image = await picker.pickImage(source: ImageSource.gallery, imageQuality: 85);
    if (image == null) return;

    setState(() => _isUploading = true);
    final url = await _api.uploadAvatar(image.path);
    setState(() => _isUploading = false);

    if (url != null) {
      auth.updateAvatar(url);
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text("Profil rasmi muvaffaqiyatli yangilandi!")),
        );
      }
    }
  }

  void _pickAndUploadBanner(AuthProvider auth) async {
    final picker = ImagePicker();
    final image = await picker.pickImage(source: ImageSource.gallery, imageQuality: 85);
    if (image == null) return;

    setState(() => _isUploading = true);
    final url = await _api.uploadBanner(image.path);
    setState(() => _isUploading = false);

    if (url != null) {
      auth.updateBanner(url);
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text("Profil banneri muvaffaqiyatli yangilandi!")),
        );
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final auth = Provider.of<AuthProvider>(context);
    final animeProvider = Provider.of<AnimeProvider>(context);
    final user = auth.user;

    // If guest mode
    if (auth.isGuest || user == null) {
      return Scaffold(
        backgroundColor: AppColors.background,
        body: Center(
          child: Padding(
            padding: const EdgeInsets.all(24),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                const Icon(Icons.lock_person_rounded, color: AppColors.primary, size: 64),
                const SizedBox(height: 16),
                const Text(
                  "Mehmon rejimidasiiz",
                  style: TextStyle(color: Colors.white, fontSize: 20, fontWeight: FontWeight.w800),
                ),
                const SizedBox(height: 8),
                const Text(
                  "Sevimli animelaringizni saqlash va profilingizni boshqarish uchun tizimga kiring.",
                  textAlign: TextAlign.center,
                  style: TextStyle(color: AppColors.textSecondary, fontSize: 13),
                ),
                const SizedBox(height: 24),
                ElevatedButton(
                  onPressed: () {
                    Navigator.of(context).pushReplacement(
                      MaterialPageRoute(builder: (_) => const AuthGateScreen()),
                    );
                  },
                  style: ElevatedButton.styleFrom(
                    backgroundColor: AppColors.primary,
                    padding: const EdgeInsets.symmetric(horizontal: 28, vertical: 14),
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
                  ),
                  child: const Text("Tizimga kirish", style: TextStyle(color: Colors.white, fontWeight: FontWeight.w700)),
                ),
              ],
            ),
          ),
        ),
      );
    }

    return Scaffold(
      backgroundColor: AppColors.background,
      body: NestedScrollView(
        headerSliverBuilder: (context, innerBoxIsScrolled) {
          return [
            SliverToBoxAdapter(
              child: Stack(
                clipBehavior: Clip.none,
                children: [
                  // Banner Image with Edit Button
                  GestureDetector(
                    onTap: () => _pickAndUploadBanner(auth),
                    child: Container(
                      height: 160,
                      width: double.infinity,
                      decoration: const BoxDecoration(
                        color: AppColors.surfaceLight,
                      ),
                      child: Stack(
                        children: [
                          Positioned.fill(
                            child: CachedImageView(
                              imageUrl: user.bannerUrl ?? 'https://images.unsplash.com/photo-1578632767115-351597cf2477?w=1200&auto=format&fit=crop&q=80',
                            ),
                          ),
                          Container(color: Colors.black.withOpacity(0.3)),
                          // Camera Icon Badge
                          Positioned(
                            bottom: 10,
                            right: 14,
                            child: Container(
                              padding: const EdgeInsets.all(6),
                              decoration: BoxDecoration(
                                color: Colors.black.withOpacity(0.65),
                                shape: BoxShape.circle,
                              ),
                              child: const Icon(Icons.camera_alt_rounded, color: Colors.white, size: 16),
                            ),
                          ),
                        ],
                      ),
                    ),
                  ),

                  // Avatar Frame & Picture (Positioned Overlapping Banner)
                  Positioned(
                    bottom: -46,
                    left: 20,
                    child: GestureDetector(
                      onTap: () => _pickAndUploadAvatar(auth),
                      child: Stack(
                        alignment: Alignment.center,
                        children: [
                          // Neon Glass Ring Frame
                          Container(
                            width: 96,
                            height: 96,
                            decoration: BoxDecoration(
                              shape: BoxShape.circle,
                              gradient: AppColors.primaryGradient,
                              boxShadow: [
                                BoxShadow(
                                  color: AppColors.primary.withOpacity(0.5),
                                  blurRadius: 16,
                                ),
                              ],
                            ),
                          ),
                          // Avatar Image
                          Container(
                            width: 88,
                            height: 88,
                            decoration: const BoxDecoration(
                              shape: BoxShape.circle,
                              color: AppColors.surface,
                            ),
                            child: CachedImageView(
                              imageUrl: user.avatarUrl ?? 'https://api.animem.uz/api/images/1788100529230_au9wggu',
                              borderRadius: 44,
                            ),
                          ),
                          // Edit Badge
                          Positioned(
                            bottom: 2,
                            right: 2,
                            child: Container(
                              padding: const EdgeInsets.all(4),
                              decoration: const BoxDecoration(
                                color: AppColors.primary,
                                shape: BoxShape.circle,
                              ),
                              child: const Icon(Icons.edit_rounded, color: Colors.white, size: 14),
                            ),
                          ),
                        ],
                      ),
                    ),
                  ),
                ],
              ),
            ),

            // User Info & Level Progress
            SliverToBoxAdapter(
              child: Padding(
                padding: const EdgeInsets.fromLTRB(20, 56, 20, 16),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              user.name,
                              style: const TextStyle(
                                color: Colors.white,
                                fontSize: 20,
                                fontWeight: FontWeight.w800,
                              ),
                            ),
                            const SizedBox(height: 2),
                            Text(
                              user.email,
                              style: const TextStyle(
                                color: AppColors.textMuted,
                                fontSize: 12,
                              ),
                            ),
                          ],
                        ),
                        // Logout Action
                        IconButton(
                          icon: const Icon(Icons.logout_rounded, color: AppColors.error, size: 22),
                          onPressed: () {
                            auth.logout();
                            Navigator.of(context).pushReplacement(
                              MaterialPageRoute(builder: (_) => const AuthGateScreen()),
                            );
                          },
                        ),
                      ],
                    ),
                    const SizedBox(height: 18),

                    // Level & XP Bar Container
                    LiquidGlassContainer(
                      padding: const EdgeInsets.all(14),
                      child: Column(
                        children: [
                          Row(
                            mainAxisAlignment: MainAxisAlignment.spaceBetween,
                            children: [
                              Text(
                                "Daraja: ${user.level}-Level",
                                style: const TextStyle(color: Colors.white, fontSize: 13, fontWeight: FontWeight.w700),
                              ),
                              Row(
                                children: [
                                  const Icon(Icons.monetization_on_rounded, color: AppColors.accentGold, size: 16),
                                  const SizedBox(width: 4),
                                  Text(
                                    "${user.coins} tanga",
                                    style: const TextStyle(color: AppColors.accentGold, fontSize: 12, fontWeight: FontWeight.w700),
                                  ),
                                ],
                              ),
                            ],
                          ),
                          const SizedBox(height: 8),
                          // Progress Bar
                          ClipRRect(
                            borderRadius: BorderRadius.circular(6),
                            child: const LinearProgressIndicator(
                              value: 0.65,
                              minHeight: 6,
                              backgroundColor: Colors.white12,
                              valueColor: AlwaysStoppedAnimation<Color>(AppColors.primary),
                            ),
                          ),
                        ],
                      ),
                    ),
                  ],
                ),
              ),
            ),

            // Tab Header (Sevimlilar / Tarix)
            SliverPersistentHeader(
              pinned: true,
              delegate: _SliverAppBarDelegate(
                TabBar(
                  controller: _tabController,
                  indicatorColor: AppColors.primary,
                  indicatorWeight: 3,
                  labelColor: AppColors.primary,
                  unselectedLabelColor: AppColors.textMuted,
                  labelStyle: const TextStyle(fontSize: 14, fontWeight: FontWeight.w700),
                  tabs: const [
                    Tab(text: "Sevimlilar"),
                    Tab(text: "Ko'rish tarixi"),
                  ],
                ),
              ),
            ),
          ];
        },
        body: TabBarView(
          controller: _tabController,
          children: [
            // 1. Favorites Tab
            _buildFavoritesTab(animeProvider),

            // 2. Watch History Tab
            _buildHistoryTab(animeProvider),
          ],
        ),
      ),
    );
  }

  Widget _buildFavoritesTab(AnimeProvider provider) {
    final favs = provider.favoriteAnimes;
    if (favs.isEmpty) {
      return const Center(
        child: Text("Hozircha sevimlilar ro'yxati bo'sh", style: TextStyle(color: AppColors.textMuted)),
      );
    }

    return GridView.builder(
      padding: const EdgeInsets.fromLTRB(16, 16, 16, 100),
      gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
        crossAxisCount: 2,
        childAspectRatio: 0.62,
        crossAxisSpacing: 14,
        mainAxisSpacing: 16,
      ),
      itemCount: favs.length,
      itemBuilder: (context, index) {
        final anime = favs[index];
        return AnimeCard(
          anime: anime,
          width: double.infinity,
          height: 220,
          onTap: () {
            Navigator.of(context).push(
              MaterialPageRoute(builder: (_) => AnimeDetailsScreen(anime: anime)),
            );
          },
        );
      },
    );
  }

  Widget _buildHistoryTab(AnimeProvider provider) {
    final animes = provider.animes.take(4).toList();
    if (animes.isEmpty) {
      return const Center(
        child: Text("Tarix mavjud emas", style: TextStyle(color: AppColors.textMuted)),
      );
    }

    return ListView.builder(
      padding: const EdgeInsets.fromLTRB(16, 16, 16, 100),
      itemCount: animes.length,
      itemBuilder: (context, index) {
        final anime = animes[index];
        final lastEp = provider.getWatchProgress(anime.id);

        return Container(
          margin: const EdgeInsets.only(bottom: 12),
          child: LiquidGlassContainer(
            padding: const EdgeInsets.all(12),
            child: Row(
              children: [
                CachedImageView(imageUrl: anime.posterUrl, width: 55, height: 75, borderRadius: 10),
                const SizedBox(width: 12),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        anime.title,
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                        style: const TextStyle(color: Colors.white, fontSize: 14, fontWeight: FontWeight.w700),
                      ),
                      const SizedBox(height: 4),
                      Text("$lastEp-qism ko'rilgan", style: const TextStyle(color: AppColors.accentCyan, fontSize: 12)),
                    ],
                  ),
                ),
                ElevatedButton(
                  onPressed: () {
                    Navigator.of(context).push(
                      MaterialPageRoute(
                        builder: (_) => AnimeDetailsScreen(anime: anime, initialEpisode: lastEp),
                      ),
                    );
                  },
                  style: ElevatedButton.styleFrom(
                    backgroundColor: AppColors.primary,
                    padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                  ),
                  child: const Text("Davom", style: TextStyle(color: Colors.white, fontSize: 11, fontWeight: FontWeight.w700)),
                ),
              ],
            ),
          ),
        );
      },
    );
  }
}

class _SliverAppBarDelegate extends SliverPersistentHeaderDelegate {
  final TabBar _tabBar;
  _SliverAppBarDelegate(this._tabBar);

  @override
  double get minExtent => _tabBar.preferredSize.height;
  @override
  double get maxExtent => _tabBar.preferredSize.height;

  @override
  Widget build(BuildContext context, double shrinkOffset, bool overlapsContent) {
    return Container(
      color: AppColors.background,
      child: _tabBar,
    );
  }

  @override
  bool shouldRebuild(_SliverAppBarDelegate oldDelegate) => false;
}
