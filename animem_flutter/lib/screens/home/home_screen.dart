import 'dart:ui';
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../core/constants/app_colors.dart';
import '../../models/anime_model.dart';
import '../../providers/anime_provider.dart';
import '../../widgets/anime_card.dart';
import '../../widgets/cached_image_view.dart';
import '../details/anime_details_screen.dart';

class HomeScreen extends StatelessWidget {
  const HomeScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final animeProvider = Provider.of<AnimeProvider>(context);

    return Scaffold(
      backgroundColor: AppColors.background,
      body: RefreshIndicator(
        color: AppColors.primary,
        backgroundColor: const Color(0xFF161524),
        onRefresh: () => animeProvider.fetchAnimes(),
        child: CustomScrollView(
          physics: const BouncingScrollPhysics(parent: AlwaysScrollableScrollPhysics()),
          slivers: [
            // 1. Dynamic Top App Bar
            SliverAppBar(
              floating: true,
              pinned: true,
              backgroundColor: AppColors.background.withOpacity(0.92),
              elevation: 0,
              flexibleSpace: ClipRRect(
                child: BackdropFilter(
                  filter: ImageFilter.blur(sigmaX: 16, sigmaY: 16),
                  child: Container(color: Colors.transparent),
                ),
              ),
              title: Row(
                children: [
                  Container(
                    width: 32,
                    height: 32,
                    decoration: BoxDecoration(
                      shape: BoxShape.circle,
                      gradient: AppColors.primaryGradient,
                      boxShadow: [
                        BoxShadow(
                          color: AppColors.primary.withOpacity(0.4),
                          blurRadius: 10,
                          offset: const Offset(0, 2),
                        ),
                      ],
                    ),
                    child: const Center(
                      child: Icon(Icons.play_arrow_rounded, color: Colors.white, size: 20),
                    ),
                  ),
                  const SizedBox(width: 10),
                  RichText(
                    text: const TextSpan(
                      children: [
                        TextSpan(
                          text: 'ANIMEM',
                          style: TextStyle(
                            color: Colors.white,
                            fontSize: 19,
                            fontWeight: FontWeight.w900,
                            letterSpacing: 1.2,
                          ),
                        ),
                        TextSpan(
                          text: '.UZ',
                          style: TextStyle(
                            color: AppColors.primary,
                            fontSize: 19,
                            fontWeight: FontWeight.w900,
                            letterSpacing: 1.2,
                          ),
                        ),
                      ],
                    ),
                  ),
                ],
              ),
            ),

            // 2. Featured Hero Banner
            if (animeProvider.featuredAnimes.isNotEmpty)
              SliverToBoxAdapter(
                child: _buildHeroBanner(context, animeProvider.featuredAnimes.first, animeProvider),
              )
            else if (animeProvider.animes.isNotEmpty)
              SliverToBoxAdapter(
                child: _buildHeroBanner(context, animeProvider.animes.first, animeProvider),
              ),

            // 3. Section: Trenddagi Animelar (Horizontal)
            SliverToBoxAdapter(
              child: _buildTrendingSection(context, animeProvider),
            ),

            // 4. Section: Barcha Premyeralar Header
            SliverToBoxAdapter(
              child: Padding(
                padding: const EdgeInsets.fromLTRB(16, 24, 16, 12),
                child: Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    const Text(
                      "Premyeralar va Epizodlar",
                      style: TextStyle(
                        color: Colors.white,
                        fontSize: 18,
                        fontWeight: FontWeight.w800,
                      ),
                    ),
                    Text(
                      "${animeProvider.animes.length} ta anime",
                      style: const TextStyle(
                        color: AppColors.textMuted,
                        fontSize: 12,
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                  ],
                ),
              ),
            ),

            // 5. Grid: All Anime Catalogue
            if (animeProvider.isLoading && animeProvider.animes.isEmpty)
              const SliverFillRemaining(
                child: Center(
                  child: CircularProgressIndicator(
                    color: AppColors.primary,
                    strokeWidth: 2.5,
                  ),
                ),
              )
            else
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
                      final anime = animeProvider.animes[index];
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
                    childCount: animeProvider.animes.length,
                  ),
                ),
              ),

            // Bottom Spacing for Floating Navigation Bar
            const SliverToBoxAdapter(
              child: SizedBox(height: 100),
            ),
          ],
        ),
      ),
    );
  }

  // --- HERO BANNER ---
  Widget _buildHeroBanner(BuildContext context, AnimeModel anime, AnimeProvider provider) {
    final isFav = provider.isFavorite(anime.id);

    return Container(
      height: 360,
      margin: const EdgeInsets.fromLTRB(16, 12, 16, 16),
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(24),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withOpacity(0.6),
            blurRadius: 20,
            offset: const Offset(0, 10),
          ),
        ],
      ),
      child: ClipRRect(
        borderRadius: BorderRadius.circular(24),
        child: Stack(
          children: [
            // Poster Background Image
            Positioned.fill(
              child: CachedImageView(
                imageUrl: anime.bannerUrl ?? anime.posterUrl,
              ),
            ),

            // Gradient Overlays for Readability
            Positioned.fill(
              child: Container(
                decoration: const BoxDecoration(
                  gradient: LinearGradient(
                    colors: [
                      Colors.transparent,
                      Color(0x990A0910),
                      Color(0xF50A0910),
                    ],
                    stops: [0.2, 0.6, 1.0],
                    begin: Alignment.topCenter,
                    end: Alignment.bottomCenter,
                  ),
                ),
              ),
            ),

            // Top Badges
            Positioned(
              top: 14,
              left: 14,
              child: Container(
                padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
                decoration: BoxDecoration(
                  gradient: AppColors.primaryGradient,
                  borderRadius: BorderRadius.circular(20),
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

            // Bottom Content
            Positioned(
              bottom: 16,
              left: 16,
              right: 16,
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                mainAxisSize: MainAxisSize.min,
                children: [
                  Text(
                    anime.title,
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

                  // Metadata Info
                  Row(
                    children: [
                      const Icon(Icons.star_rounded, color: AppColors.accentGold, size: 16),
                      const SizedBox(width: 3),
                      Text(
                        anime.rating.toStringAsFixed(1),
                        style: const TextStyle(
                          color: Colors.white,
                          fontSize: 13,
                          fontWeight: FontWeight.w700,
                        ),
                      ),
                      const SizedBox(width: 8),
                      Text(
                        "•   ${anime.releaseYear}   •   ${anime.genres.isNotEmpty ? anime.genres.first : 'Anime'}",
                        style: const TextStyle(
                          color: AppColors.textSecondary,
                          fontSize: 12,
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 14),

                  // Action Buttons Row
                  Row(
                    children: [
                      // Watch CTA Button
                      Expanded(
                        child: GestureDetector(
                          onTap: () {
                            Navigator.of(context).push(
                              MaterialPageRoute(
                                builder: (_) => AnimeDetailsScreen(anime: anime),
                              ),
                            );
                          },
                          child: Container(
                            height: 46,
                            decoration: BoxDecoration(
                              gradient: AppColors.primaryGradient,
                              borderRadius: BorderRadius.circular(14),
                              boxShadow: [
                                BoxShadow(
                                  color: AppColors.primary.withOpacity(0.4),
                                  blurRadius: 12,
                                  offset: const Offset(0, 4),
                                ),
                              ],
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
                        ),
                      ),
                      const SizedBox(width: 10),

                      // Favorite Bookmark Button
                      GestureDetector(
                        onTap: () => provider.toggleFavorite(anime.id),
                        child: Container(
                          width: 46,
                          height: 46,
                          decoration: BoxDecoration(
                            color: const Color(0x881F1D30),
                            borderRadius: BorderRadius.circular(14),
                            border: Border.all(
                              color: isFav ? AppColors.primary : Colors.white.withOpacity(0.12),
                            ),
                          ),
                          child: Center(
                            child: Icon(
                              isFav ? Icons.bookmark_rounded : Icons.bookmark_border_rounded,
                              color: isFav ? AppColors.primary : Colors.white,
                              size: 22,
                            ),
                          ),
                        ),
                      ),
                    ],
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  // --- TRENDING HORIZONTAL SECTION ---
  Widget _buildTrendingSection(BuildContext context, AnimeProvider provider) {
    final list = provider.trendingAnimes.isNotEmpty
        ? provider.trendingAnimes
        : provider.animes;

    if (list.isEmpty) return const SizedBox.shrink();

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const Padding(
          padding: EdgeInsets.fromLTRB(16, 16, 16, 12),
          child: Row(
            children: [
              Icon(Icons.local_fire_department_rounded, color: Color(0xFFFF5252), size: 22),
              SizedBox(width: 6),
              Text(
                "Trenddagi Animelar",
                style: TextStyle(
                  color: Colors.white,
                  fontSize: 18,
                  fontWeight: FontWeight.w800,
                ),
              ),
            ],
          ),
        ),
        SizedBox(
          height: 250,
          child: ListView.separated(
            padding: const EdgeInsets.symmetric(horizontal: 16),
            scrollDirection: Axis.horizontal,
            physics: const BouncingScrollPhysics(),
            itemCount: list.length > 10 ? 10 : list.length,
            separatorBuilder: (_, __) => const SizedBox(width: 14),
            itemBuilder: (context, index) {
              final anime = list[index];
              return AnimeCard(
                anime: anime,
                width: 145,
                height: 240,
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
