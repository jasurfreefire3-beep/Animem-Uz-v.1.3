import 'dart:ui';
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../core/constants/app_colors.dart';
import '../../models/anime_model.dart';
import '../../providers/anime_provider.dart';
import '../../providers/auth_provider.dart';
import '../../widgets/anime_card.dart';
import '../../widgets/cached_image_view.dart';
import '../../widgets/liquid_glass_container.dart';
import '../../widgets/modern_text_field.dart';
import '../details/anime_details_screen.dart';
import '../mika/mika_ai_screen.dart';
import '../fandubs/fandub_screen.dart';

class HomeScreen extends StatefulWidget {
  const HomeScreen({super.key});

  @override
  State<HomeScreen> createState() => _HomeScreenState();
}

class _HomeScreenState extends State<HomeScreen> {
  final TextEditingController _searchController = TextEditingController();
  bool _isSearching = false;

  final List<String> _genres = [
    'Barchasi',
    'Ekshn',
    'Fentezi',
    'Sarguzasht',
    'Shonen',
    'G\'ayritabiiy',
    'Komediya',
    'Romantika',
  ];

  @override
  void dispose() {
    _searchController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final animeProvider = Provider.of<AnimeProvider>(context);
    final auth = Provider.of<AuthProvider>(context);

    return Scaffold(
      backgroundColor: AppColors.background,
      body: CustomScrollView(
        physics: const BouncingScrollPhysics(),
        slivers: [
          // 1. Dynamic Top App Bar
          SliverAppBar(
            floating: true,
            pinned: true,
            backgroundColor: AppColors.background.withOpacity(0.85),
            elevation: 0,
            flexibleSpace: ClipRRect(
              child: BackdropFilter(
                filter: ImageFilter.blur(sigmaX: 20, sigmaY: 20),
                child: Container(color: Colors.transparent),
              ),
            ),
            title: Row(
              children: [
                Container(
                  width: 32,
                  height: 32,
                  decoration: const BoxDecoration(
                    shape: BoxShape.circle,
                    gradient: AppColors.primaryGradient,
                  ),
                  child: const Center(
                    child: Icon(Icons.play_arrow_rounded, color: Colors.white, size: 20),
                  ),
                ),
                const SizedBox(width: 8),
                RichText(
                  text: const TextSpan(
                    children: [
                      TextSpan(
                        text: 'ANIMEM',
                        style: TextStyle(
                          color: Colors.white,
                          fontSize: 18,
                          fontWeight: FontWeight.w900,
                          letterSpacing: 1.2,
                        ),
                      ),
                      TextSpan(
                        text: '.UZ',
                        style: TextStyle(
                          color: AppColors.primary,
                          fontSize: 18,
                          fontWeight: FontWeight.w900,
                          letterSpacing: 1.2,
                        ),
                      ),
                    ],
                  ),
                ),
              ],
            ),
            actions: [
              // Mika AI Floating Action Button
              IconButton(
                icon: Container(
                  padding: const EdgeInsets.all(6),
                  decoration: BoxDecoration(
                    gradient: AppColors.primaryGradient,
                    borderRadius: BorderRadius.circular(10),
                  ),
                  child: const Icon(Icons.auto_awesome_rounded, color: Colors.white, size: 18),
                ),
                onPressed: () {
                  Navigator.of(context).push(
                    MaterialPageRoute(builder: (_) => const MikaAiScreen()),
                  );
                },
              ),
              // Search toggle
              IconButton(
                icon: Icon(
                  _isSearching ? Icons.close_rounded : Icons.search_rounded,
                  color: Colors.white,
                ),
                onPressed: () {
                  setState(() {
                    _isSearching = !_isSearching;
                    if (!_isSearching) {
                      _searchController.clear();
                      animeProvider.setSearchQuery('');
                    }
                  });
                },
              ),
              const SizedBox(width: 8),
            ],
          ),

          // 2. Search Field Bar (Visible when opened)
          if (_isSearching)
            SliverToBoxAdapter(
              child: Padding(
                padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                child: ModernTextField(
                  controller: _searchController,
                  hintText: "Anime nomi yoki dublyaj jamoasini qidiring...",
                  prefixIcon: const Icon(Icons.search_rounded, color: AppColors.primary),
                  onChanged: (val) => animeProvider.setSearchQuery(val),
                ),
              ),
            ),

          // If Searching: Show Filtered Results Grid directly!
          if (animeProvider.searchQuery.isNotEmpty)
            SliverPadding(
              padding: const EdgeInsets.all(16),
              sliver: SliverGrid(
                gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
                  crossAxisCount: 2,
                  childAspectRatio: 0.62,
                  crossAxisSpacing: 14,
                  mainAxisSpacing: 16,
                ),
                delegate: SliverChildBuilderDelegate(
                  (context, index) {
                    final anime = animeProvider.filteredAnimes[index];
                    return AnimeCard(
                      anime: anime,
                      width: double.infinity,
                      height: 220,
                      onTap: () {
                        Navigator.of(context).push(
                          MaterialPageRoute(
                            builder: (_) => AnimeDetailsScreen(anime: anime),
                          ),
                        );
                      },
                    );
                  },
                  childCount: animeProvider.filteredAnimes.length,
                ),
              ),
            )
          else ...[
            // 3. Featured Hero Carousel
            SliverToBoxAdapter(
              child: _buildHeroBanner(animeProvider.featuredAnimes),
            ),

            // 4. Quick Action Pills
            SliverToBoxAdapter(
              child: _buildQuickActionPills(context),
            ),

            // 5. Genre Filter Chips
            SliverToBoxAdapter(
              child: _buildGenreFilterBar(animeProvider),
            ),

            // 6. Section 1: Trending Animelar
            SliverToBoxAdapter(
              child: _buildAnimeSection(
                title: "🔥 Trenddagi Animelar",
                animes: animeProvider.trendingAnimes.isNotEmpty 
                    ? animeProvider.trendingAnimes 
                    : animeProvider.animes,
              ),
            ),

            // 7. Section 2: Yangi Chiqishlar
            SliverToBoxAdapter(
              child: _buildAnimeSection(
                title: "✨ Yangi Chiqishlar (2024)",
                animes: animeProvider.animes.where((a) => a.releaseYear >= 2023).toList(),
              ),
            ),

            // 8. Section 3: Barcha Saralangan Animelar Grid
            SliverToBoxAdapter(
              child: Padding(
                padding: const EdgeInsets.fromLTRB(16, 24, 16, 12),
                child: Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    const Text(
                      "Katalogdagi Animelar",
                      style: TextStyle(
                        color: Colors.white,
                        fontSize: 18,
                        fontWeight: FontWeight.w800,
                      ),
                    ),
                    Text(
                      "${animeProvider.filteredAnimes.length} ta anime",
                      style: const TextStyle(
                        color: AppColors.textMuted,
                        fontSize: 12,
                      ),
                    ),
                  ],
                ),
              ),
            ),

            SliverPadding(
              padding: const EdgeInsets.symmetric(horizontal: 16),
              sliver: SliverGrid(
                gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
                  crossAxisCount: 2,
                  childAspectRatio: 0.62,
                  crossAxisSpacing: 14,
                  mainAxisSpacing: 16,
                ),
                delegate: SliverChildBuilderDelegate(
                  (context, index) {
                    final anime = animeProvider.filteredAnimes[index];
                    return AnimeCard(
                      anime: anime,
                      width: double.infinity,
                      height: 220,
                      onTap: () {
                        Navigator.of(context).push(
                          MaterialPageRoute(
                            builder: (_) => AnimeDetailsScreen(anime: anime),
                          ),
                        );
                      },
                    );
                  },
                  childCount: animeProvider.filteredAnimes.length,
                ),
              ),
            ),

            // Bottom space for floating nav bar
            const SliverToBoxAdapter(
              child: SizedBox(height: 100),
            ),
          ],
        ],
      ),
    );
  }

  // --- HERO CAROUSEL WIDGET ---
  Widget _buildHeroBanner(List<AnimeModel> featured) {
    if (featured.isEmpty) return const SizedBox.shrink();
    final topAnime = featured.first;

    return GestureDetector(
      onTap: () {
        Navigator.of(context).push(
          MaterialPageRoute(builder: (_) => AnimeDetailsScreen(anime: topAnime)),
        );
      },
      child: Container(
        height: 380,
        margin: const EdgeInsets.fromLTRB(16, 8, 16, 16),
        decoration: BoxDecoration(
          borderRadius: BorderRadius.circular(24),
          boxShadow: [
            BoxShadow(
              color: Colors.black.withOpacity(0.5),
              blurRadius: 20,
              offset: const Offset(0, 10),
            ),
          ],
        ),
        child: ClipRRect(
          borderRadius: BorderRadius.circular(24),
          child: Stack(
            children: [
              // Banner Backdrop
              Positioned.fill(
                child: CachedImageView(
                  imageUrl: topAnime.bannerUrl ?? topAnime.posterUrl,
                ),
              ),

              // Deep Contrast Overlays
              Positioned.fill(
                child: Container(
                  decoration: const BoxDecoration(
                    gradient: LinearGradient(
                      colors: [
                        Colors.transparent,
                        Color(0x99000000),
                        Color(0xF007070A),
                      ],
                      stops: [0.25, 0.65, 1.0],
                      begin: Alignment.topCenter,
                      end: Alignment.bottomCenter,
                    ),
                  ),
                ),
              ),

              // Top Badges
              Positioned(
                top: 16,
                left: 16,
                child: Container(
                  padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
                  decoration: BoxDecoration(
                    color: AppColors.primary,
                    borderRadius: BorderRadius.circular(20),
                    boxShadow: [
                      BoxShadow(
                        color: AppColors.primary.withOpacity(0.6),
                        blurRadius: 12,
                      ),
                    ],
                  ),
                  child: const Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Icon(Icons.whatshot_rounded, color: Colors.white, size: 14),
                      SizedBox(width: 4),
                      Text(
                        "TOP PREMYERA",
                        style: TextStyle(
                          color: Colors.white,
                          fontSize: 10,
                          fontWeight: FontWeight.w800,
                          letterSpacing: 0.5,
                        ),
                      ),
                    ],
                  ),
                ),
              ),

              // Bottom Details & Action Button
              Positioned(
                bottom: 16,
                left: 16,
                right: 16,
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Text(
                      topAnime.title,
                      maxLines: 2,
                      overflow: TextOverflow.ellipsis,
                      style: const TextStyle(
                        color: Colors.white,
                        fontSize: 22,
                        fontWeight: FontWeight.w800,
                        height: 1.2,
                      ),
                    ),
                    const SizedBox(height: 6),
                    Row(
                      children: [
                        const Icon(Icons.star_rounded, color: AppColors.accentGold, size: 16),
                        const SizedBox(width: 3),
                        Text(
                          topAnime.rating.toStringAsFixed(1),
                          style: const TextStyle(
                            color: Colors.white,
                            fontSize: 13,
                            fontWeight: FontWeight.w700,
                          ),
                        ),
                        const SizedBox(width: 10),
                        Text(
                          "•   ${topAnime.releaseYear}   •   ${topAnime.genres.first}",
                          style: const TextStyle(
                            color: AppColors.textSecondary,
                            fontSize: 12,
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 14),
                    // Watch CTA Button
                    Container(
                      height: 46,
                      decoration: BoxDecoration(
                        gradient: AppColors.primaryGradient,
                        borderRadius: BorderRadius.circular(14),
                      ),
                      child: const Center(
                        child: Row(
                          mainAxisAlignment: MainAxisAlignment.center,
                          children: [
                            Icon(Icons.play_arrow_rounded, color: Colors.white, size: 22),
                            SizedBox(width: 6),
                            Text(
                              "Hozir tomosha qilish",
                              style: TextStyle(
                                color: Colors.white,
                                fontSize: 14,
                                fontWeight: FontWeight.w700,
                              ),
                            ),
                          ],
                        ),
                      ),
                    ),
                  ],
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  // --- QUICK ACTION PILLS ---
  Widget _buildQuickActionPills(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          _buildPillItem(
            icon: Icons.groups_rounded,
            title: "Fandublar",
            color: const Color(0xFF00F2FE),
            onTap: () {
              Navigator.of(context).push(
                MaterialPageRoute(builder: (_) => const FandubScreen()),
              );
            },
          ),
          _buildPillItem(
            icon: Icons.auto_awesome_rounded,
            title: "Mika AI",
            color: AppColors.primary,
            onTap: () {
              Navigator.of(context).push(
                MaterialPageRoute(builder: (_) => const MikaAiScreen()),
              );
            },
          ),
          _buildPillItem(
            icon: Icons.leaderboard_rounded,
            title: "Top 100",
            color: AppColors.accentGold,
            onTap: () {},
          ),
          _buildPillItem(
            icon: Icons.favorite_rounded,
            title: "Sevimlilar",
            color: const Color(0xFFFF2A85),
            onTap: () {},
          ),
        ],
      ),
    );
  }

  Widget _buildPillItem({
    required IconData icon,
    required String title,
    required Color color,
    required VoidCallback onTap,
  }) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
        decoration: BoxDecoration(
          color: AppColors.surfaceLight,
          borderRadius: BorderRadius.circular(16),
          border: Border.all(color: Colors.white.withOpacity(0.08)),
        ),
        child: Column(
          children: [
            Icon(icon, color: color, size: 22),
            const SizedBox(height: 4),
            Text(
              title,
              style: const TextStyle(
                color: Colors.white,
                fontSize: 11,
                fontWeight: FontWeight.w600,
              ),
            ),
          ],
        ),
      ),
    );
  }

  // --- GENRE FILTER BAR ---
  Widget _buildGenreFilterBar(AnimeProvider animeProvider) {
    return SizedBox(
      height: 42,
      child: ListView.builder(
        scrollDirection: Axis.horizontal,
        physics: const BouncingScrollPhysics(),
        padding: const EdgeInsets.symmetric(horizontal: 16),
        itemCount: _genres.length,
        itemBuilder: (context, index) {
          final genre = _genres[index];
          final isSelected = animeProvider.selectedGenre == genre;

          return GestureDetector(
            onTap: () => animeProvider.setSelectedGenre(genre),
            child: AnimatedContainer(
              duration: const Duration(milliseconds: 200),
              margin: const EdgeInsets.only(right: 8),
              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
              decoration: BoxDecoration(
                color: isSelected ? AppColors.primary : AppColors.surfaceLight,
                borderRadius: BorderRadius.circular(20),
                border: Border.all(
                  color: isSelected ? AppColors.primary : Colors.white.withOpacity(0.08),
                ),
              ),
              child: Center(
                child: Text(
                  genre,
                  style: TextStyle(
                    color: isSelected ? Colors.white : AppColors.textSecondary,
                    fontSize: 12,
                    fontWeight: isSelected ? FontWeight.w700 : FontWeight.w500,
                  ),
                ),
              ),
            ),
          );
        },
      ),
    );
  }

  // --- HORIZONTAL ANIME SECTION ---
  Widget _buildAnimeSection({
    required String title,
    required List<AnimeModel> animes,
  }) {
    if (animes.isEmpty) return const SizedBox.shrink();

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Padding(
          padding: const EdgeInsets.fromLTRB(16, 24, 16, 12),
          child: Text(
            title,
            style: const TextStyle(
              color: Colors.white,
              fontSize: 18,
              fontWeight: FontWeight.w800,
            ),
          ),
        ),
        SizedBox(
          height: 280,
          child: ListView.builder(
            scrollDirection: Axis.horizontal,
            physics: const BouncingScrollPhysics(),
            padding: const EdgeInsets.symmetric(horizontal: 16),
            itemCount: animes.length,
            itemBuilder: (context, index) {
              final anime = animes[index];
              return AnimeCard(
                anime: anime,
                onTap: () {
                  Navigator.of(context).push(
                    MaterialPageRoute(
                      builder: (_) => AnimeDetailsScreen(anime: anime),
                    ),
                  );
                },
              );
            },
          ),
        ),
      ],
    );
  }
}
