class ChatMessageModel {
  final String id;
  final int userId;
  final String userName;
  final String? userAvatar;
  final String text;
  final String role;
  final DateTime timestamp;
  final String? replyTo;

  ChatMessageModel({
    required this.id,
    required this.userId,
    required this.userName,
    this.userAvatar,
    required this.text,
    this.role = 'user',
    required this.timestamp,
    this.replyTo,
  });

  bool get isAdmin => role == 'admin' || role == 'moderator';

  factory ChatMessageModel.fromJson(Map<String, dynamic> json) {
    DateTime parsedTime;
    try {
      parsedTime = json['created_at'] != null 
          ? DateTime.parse(json['created_at'].toString()) 
          : DateTime.now();
    } catch (_) {
      parsedTime = DateTime.now();
    }

    return ChatMessageModel(
      id: json['id']?.toString() ?? DateTime.now().millisecondsSinceEpoch.toString(),
      userId: int.tryParse(json['user_id']?.toString() ?? '0') ?? 0,
      userName: json['user_name'] ?? json['name'] ?? 'Foydalanuvchi',
      userAvatar: json['user_avatar'] ?? json['avatar_url'],
      text: json['message'] ?? json['text'] ?? '',
      role: json['role'] ?? 'user',
      timestamp: parsedTime,
      replyTo: json['reply_to'],
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'user_id': userId,
      'user_name': userName,
      'user_avatar': userAvatar,
      'text': text,
      'role': role,
      'timestamp': timestamp.toIso8601String(),
      'reply_to': replyTo,
    };
  }
}
