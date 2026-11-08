import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:provider/provider.dart';
import 'package:video_player/video_player.dart';
import 'package:webview_flutter/webview_flutter.dart';
import '../../core/constants/app_colors.dart';
import '../../models/anime_model.dart';
import '../../models/episode_model.dart';
import '../../providers/anime_provider.dart';
import '../../widgets/cached_image_view.dart';
import '../../widgets/liquid_glass_container.dart';

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
  
  // Video Player States
  VideoPlayerController? _videoPlayerController;
  WebViewController? _webViewController;
  bool _isPlayerInitialized = false;
  bool _isPlayerError = false;
  bool _isPlaying = true;
  bool _isEmbedIframe = false;

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 3, vsync: this);
    _selectedEpisode = widget.initialEpisode;
    _initializePlayerForCurrentEpisode();
  }

  void _initializePlayerForCurrentEpisode() {
    // 1. Dispose previous player instances cleanly
    _videoPlayerController?.dispose();
    _videoPlayerController = null;
    _webViewController = null;
    _isPlayerInitialized = false;
    _isPlayerError = false;

    // 2. Resolve video URL for selected episode
    String videoUrl = '';
    if (widget.anime.episodes.isNotEmpty) {
      final ep = widget.anime.episodes.firstWhere(
        (e) => e.episodeNumber == _selectedEpisode,
        orElse: () => widget.anime.episodes.first,
      );
      videoUrl = ep.videoUrl;
    }

    if (videoUrl.isEmpty) {
      videoUrl = "https://archive.org/download/BigBuckBunny_124/Content/big_buck_bunny_720p_surround.mp4";
    }

    // 3. Determine if it's an Embed iFrame or Native (.mp4 / .m3u8)
    final isIframe = videoUrl.contains('sibnet.ru') ||
        videoUrl.contains('youtube.com') ||
        videoUrl.contains('alloha') ||
        videoUrl.contains('kodik') ||
        videoUrl.contains('playerjs') ||
        videoUrl.contains('<iframe');

    if (isIframe) {
      _isEmbedIframe = true;
      String targetUrl = videoUrl;
      if (videoUrl.contains('src="')) {
        final match = RegExp(r'src="([^"]+)"').firstMatch(videoUrl);
        if (match != null) targetUrl = match.group(1)!;
      }
      if (targetUrl.startsWith('//')) targetUrl = 'https:$targetUrl';

      _webViewController = WebViewController()
        ..setJavaScriptMode(JavaScriptMode.unrestricted)
        ..setBackgroundColor(Colors.black)
        ..loadRequest(Uri.parse(targetUrl));
      
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
          });
          _videoPlayerController?.play();
        }).catchError((err) {
          if (!mounted) return;
          setState(() {
            _isPlayerError = true;
          });
        });
    }

    // Save watch progress
    final provider = Provider.of<AnimeProvider>(context, listen: false);
    provider.saveWatchProgress(widget.anime.id, _selectedEpisode);
  }

  void _switchEpisode(int episodeNumber) {
    if (_selectedEpisode == episodeNumber) return;
    setState(() {
      _selectedEpisode = episodeNumber;
    });
    _initializePlayerForCurrentEpisode();
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
            // 1. UNIVERSAL VIDEO PLAYER CONTAINER
            AspectRatio(
              aspectRatio: 16 / 9,
              child: Container(
                color: Colors.black,
                child: Stack(
                  alignment: Alignment.center,
                  children: [
                    if (_isEmbedIframe && _webViewController != null)
                      WebViewWidget(controller: _webViewController!)
                    else if (_isPlayerInitialized && _videoPlayerController != null)
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
                            // Center Play/Pause Indicator on tap
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
                            // Bottom Progress Bar
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
                    else if (_isPlayerError)
                      Center(
                        child: Column(
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            const Icon(Icons.error_outline_rounded, color: AppColors.error, size: 36),
                            const SizedBox(height: 8),
                            const Text("Videoni yuklab bo'lmadi", style: TextStyle(color: Colors.white, fontSize: 13)),
                            TextButton(
                              onPressed: _initializePlayerForCurrentEpisode,
                              child: const Text("Qayta urinish", style: TextStyle(color: AppColors.accentCyan)),
                            ),
                          ],
                        ),
                      )
                    else
                      // Subtle Skeleton while loading
                      Stack(
                        alignment: Alignment.center,
                        children: [
                          CachedImageView(
                            imageUrl: anime.bannerUrl ?? anime.posterUrl,
                            width: double.infinity,
                            height: double.infinity,
                          ),
                          Container(color: Colors.black.withOpacity(0.55)),
                          const CircularProgressIndicator(
                            strokeWidth: 2.5,
                            valueColor: AlwaysStoppedAnimation<Color>(AppColors.primary),
                          ),
                        ],
                      ),

                    // Top Back & Controls Overlay
                    Positioned(
                      top: 10,
                      left: 10,
                      child: Container(
                        decoration: BoxDecoration(
                          shape: BoxShape.circle,
                          color: Colors.black.withOpacity(0.5),
                        ),
                        child: IconButton(
                          icon: const Icon(Icons.arrow_back_ios_new_rounded, color: Colors.white, size: 18),
                          onPressed: () => Navigator.of(context).pop(),
                        ),
                      ),
                    ),
                  ],
                ),
              ),
            ),

            // 2. ANIME TITLE & ACTION BUTTONS BAR
            Padding(
              padding: const EdgeInsets.fromLTRB(16, 14, 16, 10),
              child: Row(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          anime.title,
                          maxLines: 2,
                          overflow: TextOverflow.ellipsis,
                          style: const TextStyle(
                            color: Colors.white,
                            fontSize: 18,
                            fontWeight: FontWeight.w800,
                          ),
                        ),
                        const SizedBox(height: 4),
                        Row(
                          children: [
                            const Icon(Icons.star_rounded, color: AppColors.accentGold, size: 15),
                            const SizedBox(width: 3),
                            Text(
                              anime.rating.toStringAsFixed(1),
                              style: const TextStyle(color: Colors.white, fontSize: 12, fontWeight: FontWeight.w700),
                            ),
                            const SizedBox(width: 8),
                            Text(
                              "$_selectedEpisode-qism  •  ${anime.releaseYear}  •  ${anime.status}",
                              style: const TextStyle(color: AppColors.textSecondary, fontSize: 11),
                            ),
                          ],
                        ),
                      ],
                    ),
                  ),
                  // Action: Favorite Toggle
                  IconButton(
                    icon: Icon(
                      isFav ? Icons.favorite_rounded : Icons.favorite_outline_rounded,
                      color: isFav ? AppColors.primary : Colors.white,
                      size: 26,
                    ),
                    onPressed: () {
                      animeProvider.toggleFavorite(anime.id);
                      HapticFeedback.lightImpact();
                    },
                  ),
                ],
              ),
            ),

            // 3. TABS (Qismlar, Tavsif, Izohlar)
            TabBar(
              controller: _tabController,
              indicatorColor: AppColors.primary,
              indicatorWeight: 3,
              labelColor: AppColors.primary,
              unselectedLabelColor: AppColors.textMuted,
              labelStyle: const TextStyle(fontSize: 14, fontWeight: FontWeight.w700),
              tabs: const [
                Tab(text: "Qismlar"),
                Tab(text: "Tavsif"),
                Tab(text: "Izohlar"),
              ],
            ),

            // 4. TAB VIEWS
            Expanded(
              child: TabBarView(
                controller: _tabController,
                children: [
                  // Tab 1: Episodes Grid/List
                  _buildEpisodesTab(),

                  // Tab 2: Overview & Details
                  _buildOverviewTab(anime),

                  // Tab 3: Comments Sheet
                  _buildCommentsTab(),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  // --- EPISODES SELECTOR TAB ---
  Widget _buildEpisodesTab() {
    final total = widget.anime.totalEpisodes > 0 ? widget.anime.totalEpisodes : 12;

    return GridView.builder(
      padding: const EdgeInsets.all(16),
      physics: const BouncingScrollPhysics(),
      gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
        crossAxisCount: 4,
        crossAxisSpacing: 10,
        mainAxisSpacing: 10,
        childAspectRatio: 1.3,
      ),
      itemCount: total,
      itemBuilder: (context, index) {
        final epNum = index + 1;
        final isSelected = _selectedEpisode == epNum;

        return GestureDetector(
          onTap: () => _switchEpisode(epNum),
          child: AnimatedContainer(
            duration: const Duration(milliseconds: 200),
            decoration: BoxDecoration(
              gradient: isSelected ? AppColors.primaryGradient : null,
              color: isSelected ? null : AppColors.surfaceLight,
              borderRadius: BorderRadius.circular(12),
              border: Border.all(
                color: isSelected ? Colors.transparent : Colors.white.withOpacity(0.08),
              ),
            ),
            child: Center(
              child: Text(
                "$epNum",
                style: TextStyle(
                  color: isSelected ? Colors.white : AppColors.textSecondary,
                  fontSize: 15,
                  fontWeight: isSelected ? FontWeight.w800 : FontWeight.w600,
                ),
              ),
            ),
          ),
        );
      },
    );
  }

  // --- OVERVIEW TAB ---
  Widget _buildOverviewTab(AnimeModel anime) {
    return SingleChildScrollView(
      padding: const EdgeInsets.all(16),
      physics: const BouncingScrollPhysics(),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Studio & Dubbing Team Info
          LiquidGlassContainer(
            padding: const EdgeInsets.all(14),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.spaceAround,
              children: [
                _buildInfoColumn("Studiya", anime.studio ?? "A-1 Pictures"),
                Container(width: 1, height: 30, color: Colors.white12),
                _buildInfoColumn("Dublyaj", anime.voiceActing ?? "Animem Uz"),
                Container(width: 1, height: 30, color: Colors.white12),
                _buildInfoColumn("Format", anime.type),
              ],
            ),
          ),
          const SizedBox(height: 20),

          // Genre Tags
          Wrap(
            spacing: 8,
            runSpacing: 8,
            children: anime.genres.map((genre) {
              return Container(
                padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                decoration: BoxDecoration(
                  color: AppColors.surfaceLight,
                  borderRadius: BorderRadius.circular(16),
                  border: Border.all(color: Colors.white.withOpacity(0.08)),
                ),
                child: Text(
                  genre,
                  style: const TextStyle(color: AppColors.accentCyan, fontSize: 12, fontWeight: FontWeight.w600),
                ),
              );
            }).toList(),
          ),
          const SizedBox(height: 20),

          // Synopsis
          const Text(
            "Syujet tavsifi",
            style: TextStyle(color: Colors.white, fontSize: 16, fontWeight: FontWeight.w700),
          ),
          const SizedBox(height: 8),
          Text(
            anime.description,
            style: const TextStyle(
              color: AppColors.textSecondary,
              fontSize: 14,
              height: 1.5,
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildInfoColumn(String label, String value) {
    return Column(
      children: [
        Text(label, style: const TextStyle(color: AppColors.textMuted, fontSize: 11)),
        const SizedBox(height: 4),
        Text(
          value,
          style: const TextStyle(color: Colors.white, fontSize: 13, fontWeight: FontWeight.w700),
        ),
      ],
    );
  }

  // --- COMMENTS TAB ---
  Widget _buildCommentsTab() {
    return Column(
      children: [
        Expanded(
          child: ListView(
            padding: const EdgeInsets.all(16),
            children: [
              _buildCommentItem("OtakuNinja", "Juda zo'r sifatli dublaj bo'libdi! Rahmat Animem jamoasi!", "15 daqiqa oldin"),
              _buildCommentItem("Sardor_Anime", "Keyingi qism qachon chiqadi? Kutib charchadik!", "1 soat oldin"),
            ],
          ),
        ),
        // Comment Input Bar
        Container(
          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
          decoration: BoxDecoration(
            color: AppColors.surface,
            border: Border(top: BorderSide(color: Colors.white.withOpacity(0.08))),
          ),
          child: Row(
            children: [
              Expanded(
                child: Container(
                  padding: const EdgeInsets.symmetric(horizontal: 14),
                  decoration: BoxDecoration(
                    color: AppColors.surfaceLight,
                    borderRadius: BorderRadius.circular(20),
                  ),
                  child: const TextField(
                    style: TextStyle(color: Colors.white, fontSize: 14),
                    decoration: InputDecoration(
                      hintText: "Fikr bildiring...",
                      hintStyle: TextStyle(color: AppColors.textMuted, fontSize: 13),
                      border: InputBorder.none,
                    ),
                  ),
                ),
              ),
              const SizedBox(width: 10),
              Container(
                decoration: const BoxDecoration(
                  shape: BoxShape.circle,
                  gradient: AppColors.primaryGradient,
                ),
                child: IconButton(
                  icon: const Icon(Icons.send_rounded, color: Colors.white, size: 18),
                  onPressed: () {},
                ),
              ),
            ],
          ),
        ),
      ],
    );
  }

  Widget _buildCommentItem(String author, String text, String time) {
    return Container(
      margin: const EdgeInsets.only(bottom: 12),
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: AppColors.surfaceLight.withOpacity(0.5),
        borderRadius: BorderRadius.circular(14),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text(author, style: const TextStyle(color: AppColors.accentCyan, fontSize: 13, fontWeight: FontWeight.w700)),
              Text(time, style: const TextStyle(color: AppColors.textMuted, fontSize: 10)),
            ],
          ),
          const SizedBox(height: 6),
          Text(text, style: const TextStyle(color: Colors.white, fontSize: 13)),
        ],
      ),
    );
  }
}
