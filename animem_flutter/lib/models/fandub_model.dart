class FandubModel {
  final int id;
  final String name;
  final String slug;
  final String logoUrl;
  final String? bannerUrl;
  final String description;
  final int subscribersCount;
  final bool isSubscribed;
  final int membersCount;
  final String? tgChannel;

  FandubModel({
    required this.id,
    required this.name,
    required this.slug,
    required this.logoUrl,
    this.bannerUrl,
    required this.description,
    this.subscribersCount = 0,
    this.isSubscribed = false,
    this.membersCount = 5,
    this.tgChannel,
  });

  factory FandubModel.fromJson(Map<String, dynamic> json) {
    return FandubModel(
      id: json['id'] is int ? json['id'] : int.tryParse(json['id']?.toString() ?? '0') ?? 0,
      name: json['name'] ?? 'Noma\'lum Fandub',
      slug: json['slug'] ?? 'fandub',
      logoUrl: json['logo_url'] ?? 'https://api.animem.uz/api/images/1788100529230_au9wggu',
      bannerUrl: json['banner_url'],
      description: json['description'] ?? 'O\'zbekcha professional anime dublaj jamoasi.',
      subscribersCount: int.tryParse(json['subscribers_count']?.toString() ?? '0') ?? 0,
      isSubscribed: json['is_subscribed'] == true,
      membersCount: int.tryParse(json['members_count']?.toString() ?? '5') ?? 5,
      tgChannel: json['tg_channel'],
    );
  }

  FandubModel copyWith({
    bool? isSubscribed,
    int? subscribersCount,
  }) {
    return FandubModel(
      id: id,
      name: name,
      slug: slug,
      logoUrl: logoUrl,
      bannerUrl: bannerUrl,
      description: description,
      subscribersCount: subscribersCount ?? this.subscribersCount,
      isSubscribed: isSubscribed ?? this.isSubscribed,
      membersCount: membersCount,
      tgChannel: tgChannel,
    );
  }
}
