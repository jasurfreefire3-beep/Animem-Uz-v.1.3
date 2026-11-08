class ReelModel {
  final int id;
  final String title;
  final String videoUrl;
  final String authorName;
  final String authorAvatar;
  final int likesCount;
  final int commentsCount;
  final bool isLiked;
  final String soundTitle;
  final String? createdAt;

  ReelModel({
    required this.id,
    required this.title,
    required this.videoUrl,
    required this.authorName,
    required this.authorAvatar,
    this.likesCount = 0,
    this.commentsCount = 0,
    this.isLiked = false,
    this.soundTitle = "Animem Uz Original Sound",
    this.createdAt,
  });

  factory ReelModel.fromJson(Map<String, dynamic> json) {
    return ReelModel(
      id: json['id'] is int ? json['id'] : int.tryParse(json['id']?.toString() ?? '0') ?? 0,
      title: json['title'] ?? 'Anime Reel',
      videoUrl: json['video_url'] ?? '',
      authorName: json['user_name'] ?? json['author'] ?? 'Animem Fan',
      authorAvatar: json['user_avatar'] ?? 'https://api.animem.uz/api/images/1788100529230_au9wggu',
      likesCount: int.tryParse(json['likes_count']?.toString() ?? '0') ?? 0,
      commentsCount: int.tryParse(json['comments_count']?.toString() ?? '0') ?? 0,
      isLiked: json['is_liked'] == true,
      soundTitle: json['sound_title'] ?? 'Original Sound - Animem Uz',
      createdAt: json['created_at'],
    );
  }

  ReelModel copyWith({
    bool? isLiked,
    int? likesCount,
    int? commentsCount,
  }) {
    return ReelModel(
      id: id,
      title: title,
      videoUrl: videoUrl,
      authorName: authorName,
      authorAvatar: authorAvatar,
      likesCount: likesCount ?? this.likesCount,
      commentsCount: commentsCount ?? this.commentsCount,
      isLiked: isLiked ?? this.isLiked,
      soundTitle: soundTitle,
      createdAt: createdAt,
    );
  }
}
