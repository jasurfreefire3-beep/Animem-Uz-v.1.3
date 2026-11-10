class EpisodeModel {
  final int episodeNumber;
  final String title;
  final String videoUrl;
  final String? duration;
  final String? thumbnail;
  final String? serverName;

  EpisodeModel({
    required this.episodeNumber,
    required this.title,
    required this.videoUrl,
    this.duration,
    this.thumbnail,
    this.serverName,
  });

  factory EpisodeModel.fromJson(Map<String, dynamic> json) {
    final epNum = json['episode_number'] is int
        ? json['episode_number']
        : int.tryParse(json['episode_number']?.toString() ?? '1') ?? 1;

    final rawTitle = json['title']?.toString().trim();
    final cleanTitle = (rawTitle != null && rawTitle.isNotEmpty)
        ? rawTitle
        : "$epNum-qism";

    return EpisodeModel(
      episodeNumber: epNum,
      title: cleanTitle,
      videoUrl: json['video_url']?.toString() ?? '',
      duration: json['duration']?.toString(),
      thumbnail: json['thumbnail']?.toString() ?? json['thumbnail_url']?.toString(),
      serverName: json['server_name']?.toString(),
    );
  }

  /// Extracts pure embed / video URL from iframe tag or raw URL
  String get resolvedVideoUrl {
    if (videoUrl.isEmpty) return '';
    String raw = videoUrl.trim();
    if (raw.toLowerCase().contains('<iframe')) {
      final match = RegExp(r'''src=["']([^"']+)["']''', caseSensitive: false).firstMatch(raw);
      if (match != null) {
        raw = match.group(1)!;
      }
    }
    if (raw.startsWith('//')) {
      raw = 'https:$raw';
    }
    raw = raw.replaceAll('s2-animem.wasmer.app', 'animem-uz-jasurfreefire3.wasmer.app');
    raw = raw.replaceAll('ss-test.wasmer.app', 'animem-uz-jasurfreefire3.wasmer.app');
    return raw;
  }

  bool get isIframe {
    final url = resolvedVideoUrl.toLowerCase();
    return videoUrl.toLowerCase().contains('<iframe') ||
        url.contains('/embed/') ||
        url.contains('sibnet.ru') ||
        url.contains('kodik.') ||
        url.contains('youtube.com') ||
        url.contains('youtu.be') ||
        url.contains('alloha') ||
        url.contains('playerjs') ||
        url.contains('mover.uz') ||
        url.contains('ok.ru') ||
        url.contains('vk.com');
  }

  Map<String, dynamic> toJson() {
    return {
      'episode_number': episodeNumber,
      'title': title,
      'video_url': videoUrl,
      'duration': duration,
      'thumbnail': thumbnail,
      'server_name': serverName,
    };
  }
}
