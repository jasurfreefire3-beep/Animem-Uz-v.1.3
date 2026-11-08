class EpisodeModel {
  final int episodeNumber;
  final String title;
  final String videoUrl;
  final String? duration;
  final String? thumbnail;

  EpisodeModel({
    required this.episodeNumber,
    required this.title,
    required this.videoUrl,
    this.duration,
    this.thumbnail,
  });

  factory EpisodeModel.fromJson(Map<String, dynamic> json) {
    return EpisodeModel(
      episodeNumber: json['episode_number'] is int 
          ? json['episode_number'] 
          : int.tryParse(json['episode_number']?.toString() ?? '1') ?? 1,
      title: json['title'] ?? "${json['episode_number'] ?? 1}-qism",
      videoUrl: json['video_url'] ?? '',
      duration: json['duration'],
      thumbnail: json['thumbnail'],
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'episode_number': episodeNumber,
      'title': title,
      'video_url': videoUrl,
      'duration': duration,
      'thumbnail': thumbnail,
    };
  }
}
