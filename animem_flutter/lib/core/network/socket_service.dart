import 'dart:async';
import 'package:socket_io_client/socket_io_client.dart' as IO;
import '../constants/api_constants.dart';
import '../../models/chat_message_model.dart';

class SocketService {
  static final SocketService _instance = SocketService._internal();
  factory SocketService() => _instance;

  IO.Socket? _socket;
  bool _isConnected = false;
  int _onlineCount = 1;

  final _messageController = StreamController<ChatMessageModel>.broadcast();
  final _onlineCountController = StreamController<int>.broadcast();
  final _typingController = StreamController<String>.broadcast();

  Stream<ChatMessageModel> get messageStream => _messageController.stream;
  Stream<int> get onlineCountStream => _onlineCountController.stream;
  Stream<String> get typingStream => _typingController.stream;

  bool get isConnected => _isConnected;
  int get onlineCount => _onlineCount;

  SocketService._internal();

  void initSocket(String? token) {
    if (_socket != null && _socket!.connected) return;

    try {
      _socket = IO.io(
        ApiConstants.socketUrl,
        IO.OptionBuilder()
            .setTransports(['websocket', 'polling'])
            .enableAutoConnect()
            .enableReconnection()
            .setReconnectionDelay(2000)
            .setExtraHeaders(token != null ? {'Authorization': 'Bearer $token'} : {})
            .build(),
      );

      _socket!.onConnect((_) {
        _isConnected = true;
        _socket!.emit('joinChat', {'room': 'global'});
      });

      _socket!.onDisconnect((_) {
        _isConnected = false;
      });

      // Online user count listener
      _socket!.on('onlineCount', (data) {
        if (data != null) {
          _onlineCount = int.tryParse(data.toString()) ?? _onlineCount;
          _onlineCountController.add(_onlineCount);
        }
      });

      // New Chat Message from Website or App
      _socket!.on('chatMessage', (data) {
        if (data is Map<String, dynamic>) {
          final msg = ChatMessageModel.fromJson(data);
          _messageController.add(msg);
        }
      });

      _socket!.on('newMessage', (data) {
        if (data is Map<String, dynamic>) {
          final msg = ChatMessageModel.fromJson(data);
          _messageController.add(msg);
        }
      });

      // User typing broadcast
      _socket!.on('userTyping', (data) {
        if (data != null && data['name'] != null) {
          _typingController.add(data['name'].toString());
        }
      });
    } catch (e) {
      print('Socket connection error: $e');
    }
  }

  void sendMessage({
    required int userId,
    required String userName,
    String? userAvatar,
    required String text,
    String? replyTo,
  }) {
    if (_socket == null || !_isConnected) {
      // Local broadcast fallback
      final localMsg = ChatMessageModel(
        id: DateTime.now().millisecondsSinceEpoch.toString(),
        userId: userId,
        userName: userName,
        userAvatar: userAvatar,
        text: text,
        timestamp: DateTime.now(),
        replyTo: replyTo,
      );
      _messageController.add(localMsg);
      return;
    }

    _socket!.emit('sendMessage', {
      'user_id': userId,
      'user_name': userName,
      'user_avatar': userAvatar,
      'message': text,
      'reply_to': replyTo,
      'created_at': DateTime.now().toIso8601String(),
    });
  }

  void sendTyping(String userName) {
    if (_socket != null && _isConnected) {
      _socket!.emit('typing', {'name': userName});
    }
  }

  void dispose() {
    _socket?.disconnect();
    _socket?.dispose();
    _messageController.close();
    _onlineCountController.close();
    _typingController.close();
  }
}
