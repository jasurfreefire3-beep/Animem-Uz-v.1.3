import 'dart:async';
import 'package:flutter/material.dart';
import '../core/network/socket_service.dart';
import '../models/chat_message_model.dart';
import '../models/user_model.dart';

class ChatProvider extends ChangeNotifier {
  final SocketService _socket = SocketService();

  final List<ChatMessageModel> _messages = [];
  int _onlineUsers = 1;
  String? _typingUser;
  Timer? _typingTimer;

  StreamSubscription? _msgSub;
  StreamSubscription? _onlineSub;
  StreamSubscription? _typingSub;

  List<ChatMessageModel> get messages => _messages;
  int get onlineUsers => _onlineUsers;
  String? get typingUser => _typingUser;

  void init(String? token) {
    _socket.initSocket(token);

    // Initial mock messages if empty
    if (_messages.isEmpty) {
      _messages.addAll([
        ChatMessageModel(
          id: '1',
          userId: 101,
          userName: 'Animem Admin',
          role: 'admin',
          text: 'Assalomu alaykum! Animem Uz jonli chatiga xush kelibsiz! 👋',
          timestamp: DateTime.now().subtract(const Duration(minutes: 5)),
        ),
        ChatMessageModel(
          id: '2',
          userId: 102,
          userName: 'Otaku_Bro',
          role: 'user',
          text: 'Solo Leveling yangi qismi qachon chiqadi?',
          timestamp: DateTime.now().subtract(const Duration(minutes: 2)),
        ),
      ]);
    }

    _msgSub = _socket.messageStream.listen((msg) {
      _messages.add(msg);
      notifyListeners();
    });

    _onlineSub = _socket.onlineCountStream.listen((count) {
      _onlineUsers = count;
      notifyListeners();
    });

    _typingSub = _socket.typingStream.listen((name) {
      _typingUser = name;
      notifyListeners();
      _typingTimer?.cancel();
      _typingTimer = Timer(const Duration(seconds: 3), () {
        _typingUser = null;
        notifyListeners();
      });
    });
  }

  void sendMessage(String text, UserModel? currentUser, {String? replyTo}) {
    if (text.trim().isEmpty) return;

    final userId = currentUser?.id ?? 0;
    final userName = currentUser?.name ?? 'Mehmon';
    final userAvatar = currentUser?.avatarUrl;

    _socket.sendMessage(
      userId: userId,
      userName: userName,
      userAvatar: userAvatar,
      text: text.trim(),
      replyTo: replyTo,
    );
  }

  void sendTyping(String userName) {
    _socket.sendTyping(userName);
  }

  @override
  void dispose() {
    _msgSub?.cancel();
    _onlineSub?.cancel();
    _typingSub?.cancel();
    _typingTimer?.cancel();
    super.dispose();
  }
}
