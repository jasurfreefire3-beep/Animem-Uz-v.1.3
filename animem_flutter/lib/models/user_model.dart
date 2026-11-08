class UserModel {
  final int id;
  final String name;
  final String email;
  final String role;
  final String? avatarUrl;
  final String? bannerUrl;
  final String? avatarFrameUrl;
  final int coins;
  final int level;
  final int xp;
  final String? telegramId;

  UserModel({
    required this.id,
    required this.name,
    required this.email,
    required this.role,
    this.avatarUrl,
    this.bannerUrl,
    this.avatarFrameUrl,
    this.coins = 0,
    this.level = 1,
    this.xp = 0,
    this.telegramId,
  });

  bool get isAdmin => role == 'admin' || role == 'owner' || role == 'moderator';

  factory UserModel.fromJson(Map<String, dynamic> json) {
    return UserModel(
      id: json['id'] is int ? json['id'] : int.tryParse(json['id']?.toString() ?? '0') ?? 0,
      name: json['name'] ?? 'Foydalanuvchi',
      email: json['email'] ?? '',
      role: json['role'] ?? 'user',
      avatarUrl: json['avatar_url'],
      bannerUrl: json['banner_url'],
      avatarFrameUrl: json['avatar_frame_url'],
      coins: json['coins'] is int ? json['coins'] : int.tryParse(json['coins']?.toString() ?? '0') ?? 0,
      level: json['level'] is int ? json['level'] : int.tryParse(json['level']?.toString() ?? '1') ?? 1,
      xp: json['xp'] is int ? json['xp'] : int.tryParse(json['xp']?.toString() ?? '0') ?? 0,
      telegramId: json['telegram_id']?.toString(),
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'name': name,
      'email': email,
      'role': role,
      'avatar_url': avatarUrl,
      'banner_url': bannerUrl,
      'avatar_frame_url': avatarFrameUrl,
      'coins': coins,
      'level': level,
      'xp': xp,
      'telegram_id': telegramId,
    };
  }

  UserModel copyWith({
    String? name,
    String? avatarUrl,
    String? bannerUrl,
    String? avatarFrameUrl,
    int? coins,
    int? level,
    int? xp,
  }) {
    return UserModel(
      id: id,
      name: name ?? this.name,
      email: email,
      role: role,
      avatarUrl: avatarUrl ?? this.avatarUrl,
      bannerUrl: bannerUrl ?? this.bannerUrl,
      avatarFrameUrl: avatarFrameUrl ?? this.avatarFrameUrl,
      coins: coins ?? this.coins,
      level: level ?? this.level,
      xp: xp ?? this.xp,
      telegramId: telegramId,
    );
  }
}
