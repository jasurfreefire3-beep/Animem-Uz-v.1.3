import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:url_launcher/url_launcher.dart';
import 'package:video_player/video_player.dart';
import 'package:webview_flutter/webview_flutter.dart';
import 'package:webview_flutter_android/webview_flutter_android.dart';
import '../../core/constants/api_constants.dart';
import '../../core/constants/app_colors.dart';
import '../../core/network/api_service.dart';
import '../../models/anime_model.dart';
import '../../models/episode_model.dart';
import '../../providers/anime_provider.dart';
import '../../widgets/cached_image_view.dart';

class AnimeDetailsScreen extends StatefulWidget {
  final AnimeModel anime;
  final int initialEpisode;

  const AnimeDetailsScreen({
    super.key,
    required this.anime,
    this.initialEpisode = 1,
  });

  @override
  State<AnimeDetailsScreen> createState() => _AnimeDetailsScreenState();
}

class _AnimeDetailsScreenState extends State<AnimeDetailsScreen> with SingleTickerProviderStateMixin {
  late TabController _tabController;
  late int _selectedEpisode;
  List<EpisodeModel> _episodes = [];
  bool _isLoadingEpisodes = false;

  // Video Player States
  VideoPlayerController? _videoPlayerController;
  WebViewController? _webViewController;
  bool _isPlayerInitialized = false;
  bool _isPlayerLoading = false;
  bool _isPlayerError = false;
  bool _isPlaying = true;
  bool _isEmbedIframe = false;

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 2, vsync: this);
    _selectedEpisode = widget.initialEpisode;
    _episodes = List.from(widget.anime.episodes);

    if (_episodes.isEmpty) {
      _fetchRealEpisodes();
    } else {
      _initializePlayerForCurrentEpisode();
    }
  }

  Future<void> _fetchRealEpisodes() async {
    setState(() => _isLoadingEpisodes = true);
    final episodes = await ApiService().fetchEpisodes(widget.anime.id);
    if (!mounted) return;

    setState(() {
      _isLoadingEpisodes = false;
      if (episodes.isNotEmpty) {
        _episodes = episodes;
        if (!_episodes.any((e) => e.episodeNumber == _selectedEpisode)) {
          _selectedEpisode = _episodes.first.episodeNumber;
        }
      }
    });

    _initializePlayerForCurrentEpisode();
  }

  void _initializePlayerForCurrentEpisode() {
    _videoPlayerController?.dispose();
    _videoPlayerController = null;
    _webViewController = null;
    _isPlayerInitialized = false;
    _isPlayerError = false;
    _isPlayerLoading = true;

    if (_episodes.isEmpty) {
      setState(() => _isPlayerLoading = false);
      return;
    }

    final ep = _episodes.firstWhere(
      (e) => e.episodeNumber == _selectedEpisode,
      orElse: () => _episodes.first,
    );

    final videoUrl = ep.resolvedVideoUrl;

    if (videoUrl.isEmpty) {
      setState(() {
        _isPlayerLoading = false;
        _isPlayerError = true;
      });
      return;
    }

    if (ep.isIframe) {
      _isEmbedIframe = true;
      final controller = WebViewController()
        ..setJavaScriptMode(JavaScriptMode.unrestricted)
        ..setBackgroundColor(Colors.black)
        ..setUserAgent(
          'Mozilla/5.0 (Linux; Android 14; Mobile) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Mobile Safari/537.36',
        )
        ..setNavigationDelegate(
          NavigationDelegate(
            onPageStarted: (_) {
              if (mounted) setState(() => _isPlayerLoading = true);
            },
            onPageFinished: (_) {
              if (mounted) {
                setState(() {
                  _isPlayerLoading = false;
                  _isPlayerInitialized = true;
                });
              }
            },
            onWebResourceError: (err) {
              debugPrint("WebView Error: ${err.description}");
            },
          ),
        );

      if (controller.platform is AndroidWebViewController) {
        final androidController = controller.platform as AndroidWebViewController;
        androidController.setMediaPlaybackRequiresUserGesture(false);
      }

      controller.loadRequest(Uri.parse(videoUrl));
      _webViewController = controller;
      setState(() {
        _isPlayerInitialized = true;
      });
    } else {
      _isEmbedIframe = false;
      _videoPlayerController = VideoPlayerController.networkUrl(Uri.parse(videoUrl))
        ..initialize().then((_) {
          if (!mounted) return;
          setState(() {
            _isPlayerInitialized = true;
            _isPlayerLoading = false;
          });
          _videoPlayerController?.play();
        }).catchError((err) {
          if (!mounted) return;
          setState(() {
            _isPlayerError = true;
            _isPlayerLoading = false;
          });
        });
    }

    final provider = Provider.of<AnimeProvider>(context, listen: false);
    provider.saveWatchProgress(widget.anime.id, _selectedEpisode);
  }

  void _switchEpisode(int epNum) {
    if (_selectedEpisode == epNum) return;
    setState(() => _selectedEpisode = epNum);
    _initializePlayerForCurrentEpisode();
  }

  void _openInExternalPlayer() async {
    if (_episodes.isEmpty) return;
    final ep = _episodes.firstWhere(
      (e) => e.episodeNumber == _selectedEpisode,
      orElse: () => _episodes.first,
    );
    final url = ep.resolvedVideoUrl;
    if (url.isNotEmpty) {
      final uri = Uri.parse(url);
      if (await canLaunchUrl(uri)) {
        await launchUrl(uri, mode: LaunchMode.externalApplication);
      }
    }
  }

  @override
  void dispose() {
    _tabController.dispose();
    _videoPlayerController?.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final anime = widget.anime;
    final animeProvider = Provider.of<AnimeProvider>(context);
    final isFav = animeProvider.isFavorite(anime.id);

    return Scaffold(
      backgroundColor: AppColors.background,
      body: SafeArea(
        child: Column(
          children: [
            // 1. VIDEO PLAYER CONTAINER (16:9)
            AspectRatio(
              aspectRatio: 16 / 9,
              child: Container(
                color: Colors.black,
                child: Stack(
                  alignment: Alignment.center,
                  children: [
                    // Native Video Player
                    if (!_isEmbedIframe && _isPlayerInitialized && _videoPlayerController != null)
                      GestureDetector(
                        onTap: () {
                          setState(() {
                            if (_videoPlayerController!.value.isPlaying) {
                              _videoPlayerController!.pause();
                              _isPlaying = false;
                            } else {
                              _videoPlayerController!.play();
                              _isPlaying = true;
                            }
                          });
                        },
                        child: Stack(
                          alignment: Alignment.center,
                          children: [
                            VideoPlayer(_videoPlayerController!),
                            if (!_isPlaying)
                              Container(
                                width: 56,
                                height: 56,
                                decoration: BoxDecoration(
                                  shape: BoxShape.circle,
                                  color: Colors.black.withOpacity(0.6),
                                ),
                                child: const Icon(Icons.play_arrow_rounded, color: Colors.white, size: 36),
                              ),
                            Positioned(
                              bottom: 0,
                              left: 0,
                              right: 0,
                              child: VideoProgressIndicator(
                                _videoPlayerController!,
                                allowScrubbing: true,
                                colors: const VideoProgressColors(
                                  playedColor: AppColors.primary,
                                  bufferedColor: Colors.white24,
                                  backgroundColor: Colors.black45,
                                ),
                              ),
                            ),
                          ],
                        ),
                      )
                    // Embed / Iframe WebView Player
                    else if (_isEmbedIframe && _webViewController != null)
                      WebViewWidget(controller: _webViewController!)
                    // Placeholder Poster
                    else
                      CachedImageView(
                        imageUrl: anime.bannerUrl ?? anime.posterUrl,
                        width: double.infinity,
                        height: double.infinity,
                      ),

                    // Loading Spinner Overlay
                    if (_isPlayerLoading || _isLoadingEpisodes)
                      Container(
                        color: Colors.black.withOpacity(0.55),
                        child: const Center(
                          child: CircularProgressIndicator(
                            color: AppColors.primary,
                            strokeWidth: 2.5,
                          ),
                        ),
                      ),

                    // Player Error Overlay
                    if (_isPlayerError)
                      Container(
                        color: Colors.black.withOpacity(0.85),
                        padding: const EdgeInsets.all(16),
                        child: Center(
                          child: Column(
                            mainAxisSize: MainAxisSize.min,
                            children: [
                              const Icon(Icons.error_outline_rounded, color: AppColors.error, size: 38),
                              const SizedBox(height: 8),
                              const Text(
                                "Videoni ichki pleyerda ochib bo'lmadi",
                                style: TextStyle(color: Colors.white, fontSize: 13, fontWeight: FontWeight.w600),
                              ),
                              const SizedBox(height: 12),
                              ElevatedButton.icon(
                                style: ElevatedButton.styleFrom(
                                  backgroundColor: AppColors.primary,
                                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                                ),
                                onPressed: _openInExternalPlayer,
                                icon: const Icon(Icons.open_in_browser_rounded, size: 18),
                                label: const Text("Tashqi brauzerda ochish"),
                              ),
                            ],
                          ),
                        ),
                      ),

                    // Top Bar (Back & External Player buttons)
                    Positioned(
                      top: 8,
                      left: 10,
                      child: Container(
                        decoration: BoxDecoration(
                          shape: BoxShape.circle,
                          color: Colors.black.withOpacity(0.6),
                        ),
                        child: IconButton(
                          icon: const Icon(Icons.arrow_back_ios_new_rounded, color: Colors.white, size: 18),
                          onPressed: () => Navigator.of(context).pop(),
                        ),
                      ),
                    ),

                    Positioned(
                      top: 8,
                      right: 10,
                      child: Container(
                        decoration: BoxDecoration(
                          color: Colors.black.withOpacity(0.6),
                          borderRadius: BorderRadius.circular(16),
                        ),
                        child: IconButton(
                          tooltip: "Tashqi pleyerda ochish",
                          icon: const Icon(Icons.open_in_browser_rounded, color: Colors.white, size: 20),
                          onPressed: _openInExternalPlayer,
                        ),
                      ),
                    ),
                  ],
                ),
              ),
            ),

            // 2. SCROLLABLE DETAILS & EPISODES
            Expanded(
              child: NestedScrollView(
                headerSliverBuilder: (context, _) => [
                  SliverToBoxAdapter(
                    child: Padding(
                      padding: const EdgeInsets.fromLTRB(16, 16, 16, 8),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          // Anime Title
                          Text(
                            anime.title,
                            style: const TextStyle(
                              color: Colors.white,
                              fontSize: 20,
                              fontWeight: FontWeight.w800,
                              height: 1.25,
                            ),
                          ),
                          const SizedBox(height: 8),

                          // Metadata row
                          Row(
                            children: [
                              const Icon(Icons.star_rounded, color: AppColors.accentGold, size: 18),
                              const SizedBox(width: 3),
                              Text(
                                anime.rating.toStringAsFixed(1),
                                style: const TextStyle(
                                  color: Colors.white,
                                  fontSize: 14,
                                  fontWeight: FontWeight.w700,
                                ),
                              ),
                              const SizedBox(width: 12),
                              Text(
                                "${anime.releaseYear} • ${anime.status}",
                                style: const TextStyle(
                                  color: AppColors.textSecondary,
                                  fontSize: 13,
                                ),
                              ),
                              const Spacer(),
                              // Bookmark button
                              IconButton(
                                icon: Icon(
                                  isFav ? Icons.bookmark_rounded : Icons.bookmark_border_rounded,
                                  color: isFav ? AppColors.primary : Colors.white70,
                                ),
                                onPressed: () => animeProvider.toggleFavorite(anime.id),
                              ),
                              // Telegram Bot Direct Play
                              IconButton(
                                tooltip: "Telegram botda ochish",
                                icon: const Icon(Icons.send_rounded, color: Color(0xFF0088CC), size: 20),
                                onPressed: () async {
                                  final uri = Uri.parse("https://t.me/${ApiConstants.telegramBotUsername}?start=anime_${anime.id}");
                                  if (await canLaunchUrl(uri)) {
                                    await launchUrl(uri, mode: LaunchMode.externalApplication);
                                  }
                                },
                              ),
                            ],
                          ),
                        ],
                      ),
                    ),
                  ),

                  // Tab Bar Header
                  SliverPersistentHeader(
                    pinned: true,
                    delegate: _SliverAppBarDelegate(
                      TabBar(
                        controller: _tabController,
                        indicatorColor: AppColors.primary,
                        indicatorWeight: 3,
                        labelColor: Colors.white,
                        unselectedLabelColor: AppColors.textMuted,
                        labelStyle: const TextStyle(fontWeight: FontWeight.w700, fontSize: 14),
                        tabs: [
                          Tab(text: "Qismlar (${_episodes.length})"),
                          const Tab(text: "Tavsif"),
                        ],
                      ),
                    ),
                  ),
                ],
                body: TabBarView(
                  controller: _tabController,
                  children: [
                    // TAB 1: EPISODES LIST
                    _buildEpisodesTab(),

                    // TAB 2: DESCRIPTION & DETAILS
                    _buildDescriptionTab(anime),
                  ],
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  // --- EPISODES TAB ---
  Widget _buildEpisodesTab() {
    if (_isLoadingEpisodes) {
      return const Center(
        child: CircularProgressIndicator(color: AppColors.primary, strokeWidth: 2.5),
      );
    }

    if (_episodes.isEmpty) {
      return Center(
        child: Padding(
          padding: const EdgeInsets.all(32),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              const Icon(Icons.movie_filter_outlined, color: AppColors.textMuted, size: 48),
              const SizedBox(height: 12),
              const Text(
                "Epizodlar hozircha yuklanmagan",
                style: TextStyle(color: Colors.white70, fontSize: 15, fontWeight: FontWeight.w600),
              ),
              const SizedBox(height: 8),
              TextButton(
                onPressed: _fetchRealEpisodes,
                child: const Text("Qayta tekshirish", style: TextStyle(color: AppColors.primary)),
              ),
            ],
          ),
        ),
      );
    }

    return ListView.separated(
      padding: const EdgeInsets.fromLTRB(16, 12, 16, 24),
      physics: const BouncingScrollPhysics(),
      itemCount: _episodes.length,
      separatorBuilder: (_, __) => const SizedBox(height: 10),
      itemBuilder: (context, index) {
        final ep = _episodes[index];
        final isSelected = ep.episodeNumber == _selectedEpisode;

        return GestureDetector(
          onTap: () => _switchEpisode(ep.episodeNumber),
          child: AnimatedContainer(
            duration: const Duration(milliseconds: 200),
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
            decoration: BoxDecoration(
              color: isSelected ? AppColors.primary.withOpacity(0.15) : const Color(0xFF141320),
              borderRadius: BorderRadius.circular(16),
              border: Border.all(
                color: isSelected ? AppColors.primary : Colors.white.withOpacity(0.08),
                width: isSelected ? 1.5 : 1.0,
              ),
            ),
            child: Row(
              children: [
                // Episode Number Badge / Play Icon
                Container(
                  width: 38,
                  height: 38,
                  decoration: BoxDecoration(
                    color: isSelected ? AppColors.primary : const Color(0xFF1F1D30),
                    borderRadius: BorderRadius.circular(12),
                  ),
                  child: Center(
                    child: isSelected
                        ? const Icon(Icons.play_arrow_rounded, color: Colors.white, size: 24)
                        : Text(
                            "${ep.episodeNumber}",
                            style: const TextStyle(
                              color: Colors.white,
                              fontSize: 14,
                              fontWeight: FontWeight.w700,
                            ),
                          ),
                  ),
                ),
                const SizedBox(width: 14),

                // Episode Title & Server
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        ep.title,
                        style: TextStyle(
                          color: isSelected ? Colors.white : Colors.white.withOpacity(0.9),
                          fontSize: 14,
                          fontWeight: isSelected ? FontWeight.w700 : FontWeight.w500,
                        ),
                      ),
                      const SizedBox(height: 3),
                      Text(
                        ep.serverName ?? "TAS-IX Ultra (1080p FHD)",
                        style: TextStyle(
                          color: isSelected ? AppColors.primary : AppColors.textMuted,
                          fontSize: 11,
                          fontWeight: FontWeight.w500,
                        ),
                      ),
                    ],
                  ),
                ),

                // Duration or Status indicator
                if (ep.duration != null && ep.duration!.isNotEmpty)
                  Text(
                    ep.duration!,
                    style: const TextStyle(color: AppColors.textMuted, fontSize: 12),
                  ),
              ],
            ),
          ),
        );
      },
    );
  }

  // --- DESCRIPTION TAB ---
  Widget _buildDescriptionTab(AnimeModel anime) {
    return SingleChildScrollView(
      padding: const EdgeInsets.all(16),
      physics: const BouncingScrollPhysics(),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Genres Chips
          Wrap(
            spacing: 8,
            runSpacing: 8,
            children: anime.genres.map((g) {
              return Container(
                padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                decoration: BoxDecoration(
                  color: const Color(0xFF161524),
                  borderRadius: BorderRadius.circular(14),
                  border: Border.all(color: Colors.white.withOpacity(0.08)),
                ),
                child: Text(
                  g,
                  style: const TextStyle(color: AppColors.textSecondary, fontSize: 12, fontWeight: FontWeight.w500),
                ),
              );
            }).toList(),
          ),
          const SizedBox(height: 18),

          // Story Synopsis
          const Text(
            "Anime Tavsifi",
            style: TextStyle(color: Colors.white, fontSize: 16, fontWeight: FontWeight.w700),
          ),
          const SizedBox(height: 8),
          Text(
            anime.description,
            style: const TextStyle(
              color: Colors.white70,
              fontSize: 14,
              height: 1.6,
            ),
          ),
          const SizedBox(height: 24),

          // Studio & Dub Info
          Container(
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              color: const Color(0xFF141320),
              borderRadius: BorderRadius.circular(16),
              border: Border.all(color: Colors.white.withOpacity(0.08)),
            ),
            child: Column(
              children: [
                _buildInfoRow("Studiyasi", anime.studio ?? "Noma'lum"),
                const Divider(color: Colors.white10, height: 16),
                _buildInfoRow("Dublyaj", anime.voiceActing ?? "Animem Uz"),
                const Divider(color: Colors.white10, height: 16),
                _buildInfoRow("Ko'rishlar", "${anime.viewsCount} marta"),
                const Divider(color: Colors.white10, height: 16),
                _buildInfoRow("Turi", anime.type),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildInfoRow(String label, String value) {
    return Row(
      mainAxisAlignment: MainAxisAlignment.spaceBetween,
      children: [
        Text(label, style: const TextStyle(color: AppColors.textMuted, fontSize: 13)),
        Text(value, style: const TextStyle(color: Colors.white, fontSize: 13, fontWeight: FontWeight.w600)),
      ],
    );
  }
}

// Persistent Header Delegate for TabBar
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
