import 'dart:math' as math;
import 'package:flutter/material.dart';

/// 3D Floating ambient logo with continuous perspective tilt
class Floating3DLogo extends StatefulWidget {
  final double size;
  final Widget child;

  const Floating3DLogo({
    super.key,
    required this.size,
    required this.child,
  });

  @override
  State<Floating3DLogo> createState() => _Floating3DLogoState();
}

class _Floating3DLogoState extends State<Floating3DLogo> with SingleTickerProviderStateMixin {
  late final AnimationController _controller;

  @override
  void initState() {
    super.initState();
    _controller = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 4200),
    )..repeat();
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return AnimatedBuilder(
      animation: _controller,
      builder: (context, child) {
        final t = _controller.value * 2 * math.pi;
        final dy = math.sin(t) * 4.5;
        final rotY = math.cos(t) * 0.08;
        final rotX = math.sin(t) * 0.05;

        return Transform.translate(
          offset: Offset(0, dy),
          child: Transform(
            alignment: Alignment.center,
            transform: Matrix4.identity()
              ..setEntry(3, 2, 0.0018)
              ..rotateX(rotX)
              ..rotateY(rotY),
            child: Container(
              width: widget.size,
              height: widget.size,
              decoration: BoxDecoration(
                borderRadius: BorderRadius.circular(widget.size * 0.25),
                boxShadow: [
                  BoxShadow(
                    color: const Color(0xFFF59E0B).withValues(alpha: 0.28 + 0.1 * math.sin(t)),
                    blurRadius: 22,
                    spreadRadius: 1,
                  ),
                ],
              ),
              child: child,
            ),
          ),
        );
      },
      child: widget.child,
    );
  }
}

/// 3D Card entrance animation
class Card3DEnter extends StatefulWidget {
  final Widget child;
  final Duration duration;

  const Card3DEnter({
    super.key,
    required this.child,
    this.duration = const Duration(milliseconds: 480),
  });

  @override
  State<Card3DEnter> createState() => _Card3DEnterState();
}

class _Card3DEnterState extends State<Card3DEnter> with SingleTickerProviderStateMixin {
  late final AnimationController _ctrl;
  late final Animation<double> _anim;

  @override
  void initState() {
    super.initState();
    _ctrl = AnimationController(vsync: this, duration: widget.duration);
    _anim = CurvedAnimation(parent: _ctrl, curve: Curves.easeOutCubic);
    _ctrl.forward();
  }

  @override
  void dispose() {
    _ctrl.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return AnimatedBuilder(
      animation: _anim,
      builder: (context, child) {
        final v = _anim.value;
        final rotX = (1.0 - v) * 0.18;
        final dy = (1.0 - v) * 18.0;
        final scale = 0.96 + 0.04 * v;

        return Opacity(
          opacity: v,
          child: Transform.translate(
            offset: Offset(0, dy),
            child: Transform(
              alignment: Alignment.center,
              transform: Matrix4.identity()
                ..setEntry(3, 2, 0.0014)
                ..rotateX(rotX)
                ..scale(scale),
              child: child,
            ),
          ),
        );
      },
      child: widget.child,
    );
  }
}

/// Interactive 3D touch-tilt card for Admin Dashboard KPIs & QR Cards
class Tilt3DCard extends StatefulWidget {
  final Widget child;
  final VoidCallback? onTap;
  final Color borderColor;
  final Color backgroundColor;
  final double borderRadius;
  final EdgeInsetsGeometry padding;

  const Tilt3DCard({
    super.key,
    required this.child,
    this.onTap,
    this.borderColor = const Color(0x4DF59E0B),
    this.backgroundColor = const Color(0xFF121216),
    this.borderRadius = 20,
    this.padding = const EdgeInsets.all(14),
  });

  @override
  State<Tilt3DCard> createState() => _Tilt3DCardState();
}

class _Tilt3DCardState extends State<Tilt3DCard> {
  bool _pressed = false;

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTapDown: (_) => setState(() => _pressed = true),
      onTapUp: (_) => setState(() => _pressed = false),
      onTapCancel: () => setState(() => _pressed = false),
      onTap: widget.onTap,
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 180),
        curve: Curves.easeOutCubic,
        transformAlignment: Alignment.center,
        transform: _pressed
            ? (Matrix4.identity()
              ..setEntry(3, 2, 0.0015)
              ..rotateX(0.05)
              ..scale(0.975))
            : Matrix4.identity(),
        padding: widget.padding,
        decoration: BoxDecoration(
          color: widget.backgroundColor,
          borderRadius: BorderRadius.circular(widget.borderRadius),
          border: Border.all(
            color: _pressed ? const Color(0xFFFBBF24) : widget.borderColor,
            width: 1.2,
          ),
          boxShadow: [
            BoxShadow(
              color: const Color(0xFFF59E0B).withValues(alpha: _pressed ? 0.2 : 0.07),
              blurRadius: _pressed ? 20 : 12,
              offset: const Offset(0, 6),
            ),
          ],
        ),
        child: widget.child,
      ),
    );
  }
}

/// 3D Platform selection card with living icon animation when selected
class PlatformTile3D extends StatefulWidget {
  final bool selected;
  final IconData icon;
  final Color iconColor;
  final String label;
  final VoidCallback onTap;

  const PlatformTile3D({
    super.key,
    required this.selected,
    required this.icon,
    required this.iconColor,
    required this.label,
    required this.onTap,
  });

  @override
  State<PlatformTile3D> createState() => _PlatformTile3DState();
}

class _PlatformTile3DState extends State<PlatformTile3D> with SingleTickerProviderStateMixin {
  late final AnimationController _pulseCtrl;

  @override
  void initState() {
    super.initState();
    _pulseCtrl = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 2400),
    );
    if (widget.selected) {
      _pulseCtrl.repeat(reverse: true);
    }
  }

  @override
  void didUpdateWidget(covariant PlatformTile3D oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (widget.selected && !_pulseCtrl.isAnimating) {
      _pulseCtrl.repeat(reverse: true);
    } else if (!widget.selected && _pulseCtrl.isAnimating) {
      _pulseCtrl.stop();
      _pulseCtrl.value = 0;
    }
  }

  @override
  void dispose() {
    _pulseCtrl.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: widget.onTap,
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 220),
        curve: Curves.easeOutCubic,
        transformAlignment: Alignment.center,
        transform: widget.selected
            ? (Matrix4.identity()
              ..setEntry(3, 2, 0.002)
              ..rotateX(-0.08)
              ..translate(0.0, -3.0)
              ..scale(1.03))
            : Matrix4.identity(),
        padding: const EdgeInsets.symmetric(vertical: 12, horizontal: 8),
        decoration: BoxDecoration(
          borderRadius: BorderRadius.circular(16),
          gradient: widget.selected
              ? const LinearGradient(
                  begin: Alignment.topCenter,
                  end: Alignment.bottomCenter,
                  colors: [Color(0x33F59E0B), Color(0xFF09090B)],
                )
              : null,
          color: widget.selected ? null : const Color(0xB318181B),
          border: Border.all(
            color: widget.selected ? const Color(0xFFFBBF24) : Colors.white12,
            width: widget.selected ? 1.5 : 1,
          ),
          boxShadow: widget.selected
              ? [
                  BoxShadow(
                    color: const Color(0xFFF59E0B).withValues(alpha: 0.3),
                    blurRadius: 16,
                    offset: const Offset(0, 6),
                  ),
                ]
              : [],
        ),
        child: Stack(
          alignment: Alignment.center,
          children: [
            if (widget.selected)
              const Positioned(
                top: 0,
                left: 0,
                child: CircleAvatar(
                  radius: 8,
                  backgroundColor: Color(0xFFFBBF24),
                  child: Icon(Icons.check, size: 11, color: Colors.black),
                ),
              ),
            Column(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                AnimatedBuilder(
                  animation: _pulseCtrl,
                  builder: (context, child) {
                    final v = widget.selected ? _pulseCtrl.value : 0.0;
                    final rotY = widget.selected ? (v - 0.5) * 0.25 : 0.0;
                    final sc = widget.selected ? 1.08 + v * 0.1 : 1.0;
                    return Transform(
                      alignment: Alignment.center,
                      transform: Matrix4.identity()
                        ..setEntry(3, 2, 0.002)
                        ..rotateY(rotY)
                        ..scale(sc),
                      child: child,
                    );
                  },
                  child: Container(
                    width: 38,
                    height: 38,
                    decoration: BoxDecoration(
                      color: widget.iconColor.withValues(alpha: 0.16),
                      borderRadius: BorderRadius.circular(11),
                      border: Border.all(color: widget.iconColor.withValues(alpha: 0.4)),
                    ),
                    child: Icon(widget.icon, color: widget.iconColor, size: 22),
                  ),
                ),
                const SizedBox(height: 8),
                Text(
                  widget.label,
                  textAlign: TextAlign.center,
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  style: TextStyle(
                    fontSize: 11.5,
                    fontWeight: FontWeight.w800,
                    color: widget.selected ? const Color(0xFFFCD34D) : Colors.white70,
                  ),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }
}
