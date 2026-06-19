import { Server } from 'socket.io';
import dotenv from 'dotenv';
dotenv.config();
import jwt from 'jsonwebtoken';
import cookie from 'cookie';
import { SOS } from '../models/sos.model.js';
import { User } from '../models/user.model.js';
import { updateUserLocation, removeUserLocation } from '../services/locationService.js';
import { findBestResponders } from '../services/dispatchService.js';
import { SOS_STATUS } from '../constant.js';

let ioInstance = null;

export const emitSOSResolved = ({ sosId, resolvedAt, debrief, broadcasterId, responderIds = [] }) => {
  if (!ioInstance) return;
  const payload = { sosId, resolvedAt, debrief };
  ioInstance.to(`sos:${sosId}`).emit('sos_resolved', payload);
  if (broadcasterId) {
    ioInstance.to(broadcasterId.toString()).emit('sos_resolved', payload);
  }
  responderIds.forEach((responderId) => {
    ioInstance.to(responderId.toString()).emit('sos_resolved', payload);
  });
};

const allowedOrigins = [
  'http://localhost:3000',
  'http://localhost:5173',
  process.env.FRONTEND_URL
].filter(Boolean);

export const initializeSocket = (server) => {
  const io = new Server(server, {
    cors: {
      origin: (origin, callback) => {
        if (!origin || allowedOrigins.includes(origin)) {
          callback(null, true);
        } else {
          callback(new Error('Not allowed by CORS'));
        }
      },
      credentials: true
    }
  });
  ioInstance = io;

  io.use((socket, next) => {
    let token = socket.handshake.auth.token;

    if (!token && socket.handshake.headers.cookie) {
        const cookies = cookie.parse(socket.handshake.headers.cookie);
        token = cookies.accessToken;
    }

    if (!token) {
      return next(new Error('Authentication required'));
    }

    try {
      const decoded = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET || "access-token-secret");
      socket.userId = decoded._id;
      next();
    } catch (error) {
      next(new Error('Invalid token'));
    }
  });

  io.on('connection', (socket) => {
    console.log(`User connected: ${socket.userId}`);
    socket.join(socket.userId);

    socket.on('join_sos', async ({ sosId }) => {
      try {
        const sos = await SOS.findById(sosId);
        if (!sos) {
          socket.emit('error', { message: 'SOS not found' });
          return;
        }

        const isBroadcaster = sos.broadcaster.toString() === socket.userId;
        const isResponder = sos.responders.some((entry) => entry.user.toString() === socket.userId);
        if (!isBroadcaster && !isResponder) {
          socket.emit('error', { message: 'Not authorized for this SOS room' });
          return;
        }

        socket.join(`sos:${sosId}`);
        if (isBroadcaster) {
          // Re-join broadcaster to all existing responder rooms (handles reconnects)
          for (const entry of sos.responders) {
            socket.join(`sos:${sosId}:responder:${entry.user.toString()}`);
          }
        }
        if (isResponder) {
          socket.join(`sos:${sosId}:responder:${socket.userId}`);
          io.to(sos.broadcaster.toString()).socketsJoin(`sos:${sosId}:responder:${socket.userId}`);
        }
      } catch (error) {
        socket.emit('error', { message: 'Failed to join SOS room' });
      }
    });

    socket.on('update_location', async ({ longitude, latitude }) => {
      try {
        await updateUserLocation(socket.userId, longitude, latitude);
        socket.emit('location_updated', { success: true });
      } catch (error) {
        socket.emit('error', { message: 'Failed to update location' });
      }
    });

    socket.on('broadcast_sos', async ({ sosId }) => {
      try {
        const sos = await SOS.findById(sosId).populate('broadcaster', 'name phone avatar');
        if (!sos) return;

        // Guardian Mode: check if broadcaster has guardians
        const broadcasterUser = await User.findById(sos.broadcaster._id).populate('guardians', '_id name');
        const guardianIds = (broadcasterUser?.guardians || []).map(g => g._id.toString());

        const [longitude, latitude] = sos.location.coordinates;
        const responders = await findBestResponders(longitude, latitude, sos.crisisType, sos.broadcastRadius);

        if (responders.length === 0 && guardianIds.length === 0) {
          socket.emit('no_responders_found');
          return;
        }

        const sosAlertPayload = (responder) => ({
          sosId: sos._id,
          crisisType: sos.crisisType,
          location: sos.location,
          address: sos.address,
          broadcaster: sos.isAnonymous ? null : sos.broadcaster,
          eta: responder?.eta || null,
          distance: responder?.distance || null
        });

        if (guardianIds.length > 0) {
          // Notify guardians FIRST with priority flag
          guardianIds.forEach(guardianId => {
            if (guardianId === sos.broadcaster._id.toString()) return;
            io.to(guardianId).emit('guardian_sos_alert', {
              ...sosAlertPayload(),
              isGuardianAlert: true,
              wardName: broadcasterUser.name
            });
            io.to(guardianId).emit('sos_alert', {
              ...sosAlertPayload(),
              isGuardianAlert: true,
              wardName: broadcasterUser.name
            });
          });

          sos.guardianNotified = true;
          await sos.save();

          // After 15 seconds, broadcast to wider community
          setTimeout(async () => {
            responders.forEach(responder => {
              if (responder.userId.toString() === sos.broadcaster._id.toString()) return;
              if (guardianIds.includes(responder.userId.toString())) return; // already notified
              io.to(responder.userId.toString()).emit('sos_alert', sosAlertPayload(responder));
            });
          }, 15000);

          socket.emit('guardians_notified', { 
            count: guardianIds.length,
            message: `${guardianIds.length} guardian(s) notified first. Community will be alerted in 15 seconds.`
          });
        } else {
          // No guardians — broadcast to everyone immediately
          responders.forEach(responder => {
            if (responder.userId.toString() === sos.broadcaster._id.toString()) return;
            io.to(responder.userId.toString()).emit('sos_alert', sosAlertPayload(responder));
          });
        }

        setTimeout(async () => {
          const updatedSOS = await SOS.findById(sosId);
          if (updatedSOS.status === SOS_STATUS.ACTIVE && updatedSOS.responders.length === 0) {
            socket.emit('expanding_search');
          }
        }, 30000);

      } catch (error) {
        socket.emit('error', { message: 'Failed to broadcast SOS' });
      }
    });

    socket.on('accept_sos', async ({ sosId }) => {
      try {
        const sos = await SOS.findById(sosId);
        if (!sos) {
          socket.emit('error', { message: 'SOS not found' });
          return;
        }

        // Check if SOS is already being handled by someone else
        if (sos.status === SOS_STATUS.RESPONDING || sos.status === SOS_STATUS.RESOLVED) {
          socket.emit('sos_already_taken', { sosId, message: 'This SOS has already been accepted by another responder.' });
          return;
        }

        const alreadyResponder = sos.responders.some((entry) => entry.user.toString() === socket.userId);
        if (alreadyResponder) {
          socket.emit('sos_accepted', { sosId: sos._id, alreadyAccepted: true });
          return;
        }

        const timeToAcceptance = (Date.now() - sos.createdAt) / 1000;
        
        sos.responders.push({
          user: socket.userId,
          acceptedAt: new Date()
        });

        if (!sos.timeToAcceptance) {
          sos.timeToAcceptance = timeToAcceptance;
        }

        sos.status = SOS_STATUS.RESPONDING;
        await sos.save();

        const populatedSOS = await SOS.findById(sosId)
          .populate('broadcaster', 'name phone avatar')
          .populate('responders.user', 'name phone avatar skills trustScore');

        const responderUser = await User.findById(socket.userId).select('name avatar skills trustScore');

        // Join rooms FIRST so everyone receives the subsequent events
        socket.join(`sos:${sosId}`);
        io.to(sos.broadcaster.toString()).socketsJoin(`sos:${sosId}`);
        const responderRoom = `sos:${sosId}:responder:${socket.userId}`;
        socket.join(responderRoom);
        io.to(sos.broadcaster.toString()).socketsJoin(responderRoom);

        io.to(sos.broadcaster.toString()).emit('responder_accepted', {
          sosId: sos._id,
          responder: populatedSOS.responders[populatedSOS.responders.length - 1],
          responderMeta: responderUser
        });

        io.to(`sos:${sosId}`).emit('sos_state_updated', {
          sosId: sos._id,
          status: populatedSOS.status,
          responders: populatedSOS.responders
        });
        io.to(sos.broadcaster.toString()).emit('sos_state_updated', {
          sosId: sos._id,
          status: populatedSOS.status,
          responders: populatedSOS.responders
        });

        const sosPayload = populatedSOS.toObject();
        if (sosPayload.isAnonymous && sosPayload.broadcaster?._id?.toString() !== socket.userId) {
          sosPayload.broadcaster = null;
        }

        socket.emit('sos_accepted', { sos: sosPayload });

      } catch (error) {
        socket.emit('error', { message: 'Failed to accept SOS' });
      }
    });

    socket.on('send_message', async ({ sosId, responderId, message }) => {
      const room = responderId ? `sos:${sosId}:responder:${responderId}` : `sos:${sosId}`;
      io.to(room).emit('new_message', {
        sosId,
        responderId: responderId || null,
        senderId: socket.userId,
        message,
        timestamp: new Date()
      });
    });

    socket.on('share_live_location', async ({ sosId, responderId, longitude, latitude }) => {
      const room = responderId ? `sos:${sosId}:responder:${responderId}` : `sos:${sosId}`;
      io.to(room).emit('live_location_update', {
        sosId,
        responderId: responderId || socket.userId,
        userId: socket.userId,
        longitude,
        latitude,
        timestamp: new Date()
      });
    });

    socket.on('disconnect', async () => {
      console.log(`User disconnected: ${socket.userId}`);
      await removeUserLocation(socket.userId);
    });
  });

  return io;
};
