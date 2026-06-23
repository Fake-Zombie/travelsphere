import React, { createContext, useContext, useEffect, useRef, useState } from "react";
import { io } from "socket.io-client";

const SocketContext = createContext(null);

export const SocketProvider = ({ user, children, onCounts }) => {
  const socketRef = useRef(null);
  const [socket, setSocket] = useState(null);
  const [onlineUsers, setOnlineUsers] = useState([]);
  const onCountsRef = useRef(onCounts);

  // Keep onCounts callback current
  useEffect(() => {
    onCountsRef.current = onCounts;
  });

  useEffect(() => {
    if (!user?._id) return;

    const sock = io("http://localhost:5000", {
      transports: ["websocket"],
    });
    socketRef.current = sock;
    setSocket(sock);

    sock.on("connect", () => {
      sock.emit("user:online", user._id);
    });

    if (sock.connected) {
      sock.emit("user:online", user._id);
    }

    sock.on("users:online", (userIds) => {
      setOnlineUsers(userIds);
    });

    // Listen for initial counts when user connects
    sock.on("user:counts", ({ pendingCount, unreadCount }) => {
      onCountsRef.current?.({ pendingCount, unreadCount });
    });

    // Listen for count updates when notifications are added/removed
    sock.on("notification:counts-updated", ({ unreadCount }) => {
      onCountsRef.current?.({ unreadCount });
    });

    return () => {
      sock.disconnect();
      socketRef.current = null;
      setSocket(null);
    };
  }, [user?._id]);

  return (
    <SocketContext.Provider value={{ socket, onlineUsers }}>
      {children}
    </SocketContext.Provider>
  );
};

export const useSocket = () => useContext(SocketContext);