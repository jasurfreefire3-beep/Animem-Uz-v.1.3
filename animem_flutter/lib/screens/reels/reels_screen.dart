import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:image_picker/image_picker.dart';
import 'package:provider/provider.dart';
import 'package:video_player/video_player.dart';
import '../../core/constants/app_colors.dart';
import '../../models/reel_model.dart';
import '../../providers/reels_provider.dart';
import '../../widgets/cached_image_view.dart';
import '../../widgets/neon_glow_button.dart';
import '../../widgets/modern_text_field.dart';

class ReelsScreen extends StatefulWidget {
  const ReelsScreen({super.key});

  @override
  State<ReelsScreen> createState() => _ReelsScreenState();
}

class _ReelsScreenState extends State<ReelsScreen> {
  final PageController _pageController = PageController();

  @override
  void dispose() {
    _pageController.dispose();
    super.dispose();
  }

  void _openUploadSheet(BuildContext context) {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (_) => const _UploadReelSheet(),
    );
  }

  @override
  Widget build(BuildContext context) {
    final reelsProvider = Provider.of<ReelsProvider>(context);
    final reels = reelsProvider.reels;

    return Scaffold(
      backgroundColor: Colors.black,
      body: Stack(
        children: [
          // Vertical Fullscreen Video Feed
          if (reels.isEmpty)
            const Center(
              child: Text("Hozircha Reels mavjud emas", style: TextStyle(color: Colors.white70)),
            )
          else
            PageView.builder(
              controller: _pageController,
              scrollDirection: Axis.vertical,
              itemCount: reels.length,
              onPageChanged: (index) => reelsProvider.setCurrentIndex(index),
              itemBuilder: (context, index) {
                return _SingleReelView(
                  reel: reels[index],
                  isActive: reelsProvider.currentIndex == index,
                  onLike: () => reelsProvider.toggleLike(reels[index].id),
                );
              },
            ),

          // Top Header (Reels Title & Upload CTA)
          SafeArea(
            child: Padding(
              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
              child: Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  const Text(
                    "Reels",
                    style: TextStyle(
                      color: Colors.white,
                      fontSize: 22,
                      fontWeight: FontWeight.w900,
                      letterSpacing: 0.5,
                      shadows: [Shadow(color: Colors.black, blurRadius: 10)],
                    ),
                  ),
                  // Upload Video Button
                  GestureDetector(
                    onTap: () => _openUploadSheet(context),
                    child: Container(
                      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 7),
                      decoration: BoxDecoration(
                        gradient: AppColors.primaryGradient,
                        borderRadius: BorderRadius.circular(20),
                        boxShadow: [
                          BoxShadow(
                            color: AppColors.primary.withOpacity(0.5),
                            blurRadius: 12,
                          ),
                        ],
                      ),
                      child: const Row(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          Icon(Icons.add_rounded, color: Colors.white, size: 18),
                          SizedBox(width: 4),
                          Text(
                            "Yuklash",
                            style: TextStyle(
                              color: Colors.white,
                              fontSize: 12,
                              fontWeight: FontWeight.w800,
                            ),
                          ),
                        ],
                      ),
                    ),
                  ),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }
}

// --- SINGLE REEL ITEM WITH PLAYER & HEART ANIMATION ---
class _SingleReelView extends StatefulWidget {
  final ReelModel reel;
  final bool isActive;
  final VoidCallback onLike;

  const _SingleReelView({
    required this.reel,
    required this.isActive,
    required this.onLike,
  });

  @override
  State<_SingleReelView> createState() => _SingleReelViewState();
}

class _SingleReelViewState extends State<_SingleReelView> with SingleTickerProviderStateMixin {
  VideoPlayerController? _controller;
  bool _isInit = false;
  bool _showHeartAnim = false;

  late AnimationController _heartAnimController;
  late Animation<double> _heartScale;

  @override
  void initState() {
    super.initState();
    _heartAnimController = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 600),
    );
    _heartScale = Tween<double>(begin: 0.0, end: 1.4).animate(
      CurvedAnimation(parent: _heartAnimController, curve: Curves.elasticOut),
    );

    _initPlayer();
  }

  void _initPlayer() {
    _controller = VideoPlayerController.networkUrl(Uri.parse(widget.reel.videoUrl))
      ..initialize().then((_) {
        if (!mounted) return;
        setState(() => _isInit = true);
        if (widget.isActive) {
          _controller?.play();
          _controller?.setLooping(true);
        }
      });
  }

  @override
  void didUpdateWidget(covariant _SingleReelView oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (widget.isActive) {
      _controller?.play();
    } else {
      _controller?.pause();
    }
  }

  @override
  void dispose() {
    _heartAnimController.dispose();
    _controller?.dispose();
    super.dispose();
  }

  void _triggerDoubleTapHeart() {
    HapticFeedback.mediumImpact();
    if (!widget.reel.isLiked) {
      widget.onLike();
    }
    setState(() => _showHeartAnim = true);
    _heartAnimController.forward(from: 0.0).then((_) {
      Future.delayed(const Duration(milliseconds: 200), () {
        if (mounted) setState(() => _showHeartAnim = false);
      });
    });
  }

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onDoubleTap: _triggerDoubleTapHeart,
      onTap: () {
        if (_controller != null && _isInit) {
          if (_controller!.value.isPlaying) {
            _controller!.pause();
          } else {
            _controller!.play();
          }
        }
      },
      child: Stack(
        fit: StackFit.expand,
        children: [
          // Background Video
          if (_isInit && _controller != null)
            FittedBox(
              fit: BoxFit.cover,
              child: SizedBox(
                width: _controller!.value.size.width,
                height: _controller!.value.size.height,
                child: VideoPlayer(_controller!),
              ),
            )
          else
            const Center(
              child: CircularProgressIndicator(
                strokeWidth: 2,
                valueColor: AlwaysStoppedAnimation<Color>(AppColors.primary),
              ),
            ),

          // Double Tap Bursting Heart Animation
          if (_showHeartAnim)
            Center(
              child: ScaleTransition(
                scale: _heartScale,
                child: const Icon(
                  Icons.favorite_rounded,
                  color: AppColors.primary,
                  size: 110,
                  shadows: [
                    Shadow(color: Colors.black54, blurRadius: 20),
                  ],
                ),
              ),
            ),

          // Right Side Action Buttons
          Positioned(
            right: 14,
            bottom: 40,
            child: Column(
              children: [
                // 1. Author Avatar
                Container(
                  width: 48,
                  height: 48,
                  decoration: BoxDecoration(
                    shape: BoxShape.circle,
                    border: Border.all(color: Colors.white, width: 2),
                  ),
                  child: CachedImageView(
                    imageUrl: widget.reel.authorAvatar,
                    borderRadius: 24,
                  ),
                ),
                const SizedBox(height: 20),

                // 2. Like Button
                IconButton(
                  icon: Icon(
                    widget.reel.isLiked ? Icons.favorite_rounded : Icons.favorite_outline_rounded,
                    color: widget.reel.isLiked ? AppColors.primary : Colors.white,
                    size: 32,
                  ),
                  onPressed: () {
                    HapticFeedback.lightImpact();
                    widget.onLike();
                  },
                ),
                Text(
                  "${widget.reel.likesCount}",
                  style: const TextStyle(color: Colors.white, fontSize: 12, fontWeight: FontWeight.w700),
                ),
                const SizedBox(height: 16),

                // 3. Comment Button
                IconButton(
                  icon: const Icon(Icons.comment_rounded, color: Colors.white, size: 28),
                  onPressed: () {},
                ),
                Text(
                  "${widget.reel.commentsCount}",
                  style: const TextStyle(color: Colors.white, fontSize: 12, fontWeight: FontWeight.w700),
                ),
                const SizedBox(height: 16),

                // 4. Share Button
                IconButton(
                  icon: const Icon(Icons.share_rounded, color: Colors.white, size: 28),
                  onPressed: () {},
                ),
              ],
            ),
          ),

          // Bottom Left: Author & Title
          Positioned(
            left: 16,
            right: 80,
            bottom: 30,
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    Text(
                      "@${widget.reel.authorName}",
                      style: const TextStyle(
                        color: Colors.white,
                        fontSize: 15,
                        fontWeight: FontWeight.w800,
                        shadows: [Shadow(color: Colors.black, blurRadius: 10)],
                      ),
                    ),
                    const SizedBox(width: 8),
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                      decoration: BoxDecoration(
                        color: AppColors.primary.withOpacity(0.85),
                        borderRadius: BorderRadius.circular(10),
                      ),
                      child: const Text("Fandub", style: TextStyle(color: Colors.white, fontSize: 10, fontWeight: FontWeight.w700)),
                    ),
                  ],
                ),
                const SizedBox(height: 8),
                Text(
                  widget.reel.title,
                  maxLines: 2,
                  overflow: TextOverflow.ellipsis,
                  style: const TextStyle(
                    color: Colors.white,
                    fontSize: 13,
                    shadows: [Shadow(color: Colors.black, blurRadius: 10)],
                  ),
                ),
                const SizedBox(height: 8),
                Row(
                  children: [
                    const Icon(Icons.music_note_rounded, color: AppColors.accentCyan, size: 16),
                    const SizedBox(width: 4),
                    Expanded(
                      child: Text(
                        widget.reel.soundTitle,
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                        style: const TextStyle(color: AppColors.accentCyan, fontSize: 12, fontWeight: FontWeight.w600),
                      ),
                    ),
                  ],
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

// --- UPLOAD REEL BOTTOM SHEET ---
class _UploadReelSheet extends StatefulWidget {
  const _UploadReelSheet();

  @override
  State<_UploadReelSheet> createState() => _UploadReelSheetState();
}

class _UploadReelSheetState extends State<_UploadReelSheet> {
  final TextEditingController _titleController = TextEditingController();
  XFile? _pickedVideo;
  bool _isUploading = false;

  void _pickVideo() async {
    final picker = ImagePicker();
    final video = await picker.pickVideo(source: ImageSource.gallery);
    if (video != null) {
      setState(() => _pickedVideo = video);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: EdgeInsets.fromLTRB(20, 20, 20, MediaQuery.of(context).viewInsets.bottom + 20),
      decoration: const BoxDecoration(
        color: AppColors.surface,
        borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
      ),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          const Text(
            "Yangi Reel Yuklash",
            style: TextStyle(color: Colors.white, fontSize: 18, fontWeight: FontWeight.w800),
          ),
          const SizedBox(height: 16),
          ModernTextField(
            controller: _titleController,
            hintText: "Reel sarlavhasi (masalan: Zoro eng yaxshi sahnasi)...",
            labelText: "Sarlavha",
          ),
          const SizedBox(height: 16),
          // Video Selector Box
          GestureDetector(
            onTap: _pickVideo,
            child: Container(
              height: 100,
              decoration: BoxDecoration(
                color: AppColors.surfaceLight,
                borderRadius: BorderRadius.circular(16),
                border: Border.all(color: Colors.white.withOpacity(0.12)),
              ),
              child: Center(
                child: _pickedVideo == null
                    ? const Column(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          Icon(Icons.video_library_rounded, color: AppColors.primary, size: 32),
                          SizedBox(height: 6),
                          Text("Galereyadan video tanlang", style: TextStyle(color: AppColors.textSecondary, fontSize: 13)),
                        ],
                      )
                    : Row(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          const Icon(Icons.check_circle_rounded, color: AppColors.success, size: 24),
                          const SizedBox(width: 8),
                          Text(
                            _pickedVideo!.name,
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                            style: const TextStyle(color: Colors.white, fontSize: 13, fontWeight: FontWeight.w600),
                          ),
                        ],
                      ),
              ),
            ),
          ),
          const SizedBox(height: 24),
          NeonGlowButton(
            text: "Serverga yuklash",
            isLoading: _isUploading,
            onPressed: () async {
              if (_pickedVideo == null) {
                ScaffoldMessenger.of(context).showSnackBar(
                  const SnackBar(content: Text("Iltimos, avval video tanlang!")),
                );
                return;
              }
              setState(() => _isUploading = true);
              final reels = Provider.of<ReelsProvider>(context, listen: false);
              final ok = await reels.uploadReel(_pickedVideo!.path, _titleController.text);
              setState(() => _isUploading = false);
              if (mounted) {
                Navigator.of(context).pop();
                ScaffoldMessenger.of(context).showSnackBar(
                  SnackBar(content: Text(ok ? "Reel muvaffaqiyatli yuklandi!" : "Yuklashda xatolik yuz berdi")),
                );
              }
            },
          ),
        ],
      ),
    );
  }
}
