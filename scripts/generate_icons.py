#!/usr/bin/env python3
"""
Generates crisp, high-quality PNG icons for Claude Tab Colorist extension at sizes 16, 32, 48, 128.
Uses only Python 3 standard library (math, struct, zlib).
"""
import math
import os
import struct
import zlib

def make_png(width, height, rgba_data):
    def chunk(tag, data):
        return struct.pack('>I', len(data)) + tag + data + struct.pack('>I', zlib.crc32(tag + data) & 0xffffffff)
    
    raw = bytearray()
    for y in range(height):
        raw.append(0)  # filter type 0 (None)
        raw.extend(rgba_data[y * width * 4 : (y + 1) * width * 4])
    
    ihdr = struct.pack('>IIBBBBB', width, height, 8, 6, 0, 0, 0)
    return b'\x89PNG\r\n\x1a\n' + chunk(b'IHDR', ihdr) + chunk(b'IDAT', zlib.compress(bytes(raw), 9)) + chunk(b'IEND', b'')

def render_icon(size):
    # Render at 2x super-sampling for smooth anti-aliased edges
    scale = 2
    w = size * scale
    h = size * scale
    
    # Palette colors (Claude aesthetics)
    # Background: Claude warm dark charcoal #1E1E1C
    bg_r, bg_g, bg_b = 30, 30, 28
    # Claude signature terracotta #CC785C
    c_r, c_g, c_b = 204, 120, 92
    
    # Secondary accent dots representing color differentiation:
    # Gold: #E5A93C, Sage: #6B8A7A, Blue: #4A6FA5, Rose: #BF6B7B
    accent_colors = [
        (204, 120, 92),   # Terracotta
        (229, 169, 60),   # Gold
        (107, 138, 122),  # Sage
        (74, 111, 165),   # Blue
        (191, 107, 123),  # Rose
    ]
    
    # Coordinate system [0, w]
    center_x = w / 2.0
    center_y = h / 2.0
    radius_sq = (w * 0.44)  # corner radius for rounded rect
    
    # Buffer initialized to transparent
    buf = bytearray(w * h * 4)
    
    for y in range(h):
        for x in range(w):
            idx = (y * w + x) * 4
            
            # Rounded squircle distance
            dx = abs(x - center_x)
            dy = abs(y - center_y)
            corner_r = w * 0.24
            inner_w = w * 0.44 - corner_r
            inner_h = h * 0.44 - corner_r
            
            cdx = max(0.0, dx - inner_w)
            cdy = max(0.0, dy - inner_h)
            dist_to_corner = math.sqrt(cdx * cdx + cdy * cdy)
            
            # Distance from edge of squircle
            dist_from_edge = corner_r - dist_to_corner
            
            if dist_from_edge < -1.0:
                continue
            
            alpha_bg = max(0.0, min(1.0, dist_from_edge + 0.5))
            
            # Draw base squircle
            pix_r, pix_g, pix_b, pix_a = bg_r, bg_g, bg_b, alpha_bg
            
            # Draw subtle warm border
            if dist_from_edge < 2.0 * scale:
                border_blend = max(0.0, min(1.0, 1.0 - (dist_from_edge / (2.0 * scale))))
                pix_r = int(pix_r * (1 - border_blend * 0.4) + 60 * border_blend * 0.4)
                pix_g = int(pix_g * (1 - border_blend * 0.4) + 55 * border_blend * 0.4)
                pix_b = int(pix_b * (1 - border_blend * 0.4) + 50 * border_blend * 0.4)
            
            # Draw Claude starburst / sparkle emblem in center
            # Claude's emblem has 6 or 8 petal-like rays radiating from center
            rel_x = (x - center_x) / (w * 0.28)
            rel_y = (y - center_y) / (h * 0.28)
            r_dist = math.sqrt(rel_x * rel_x + rel_y * rel_y)
            angle = math.atan2(rel_y, rel_x)
            
            # Starburst ray modulation (8-point modulated starburst)
            # Ray strength: (cos(4 * angle) + 1) / 2
            petals = 6
            ray = (math.cos(petals * angle) + 1.0) * 0.5
            shape_val = (0.28 + 0.72 * math.pow(ray, 1.8))
            
            star_dist = r_dist / max(0.01, shape_val)
            
            if star_dist <= 1.0:
                edge_smooth = max(0.0, min(1.0, (1.0 - star_dist) * 8.0 * scale))
                # Core Claude color gradient (terracotta warm glow)
                core_blend = max(0.0, min(1.0, 1.0 - r_dist * 0.7))
                star_r = int(c_r * 0.95 + 245 * 0.05 * core_blend)
                star_g = int(c_g * 0.95 + 160 * 0.05 * core_blend)
                star_b = int(c_b * 0.95 + 120 * 0.05 * core_blend)
                
                pix_r = int(pix_r * (1 - edge_smooth) + star_r * edge_smooth)
                pix_g = int(pix_g * (1 - edge_smooth) + star_g * edge_smooth)
                pix_b = int(pix_b * (1 - edge_smooth) + star_b * edge_smooth)
            
            # Draw 3 color differentiation accent dots along bottom/side
            dot_radius = w * 0.055
            dot_spacing = w * 0.14
            dot_center_y = h * 0.77
            start_dot_x = center_x - dot_spacing
            
            for i, dot_color in enumerate(accent_colors[:3]):
                cur_dot_x = start_dot_x + i * dot_spacing
                ddx = x - cur_dot_x
                ddy = y - dot_center_y
                dot_d = math.sqrt(ddx * ddx + ddy * ddy)
                if dot_d <= dot_radius + 1.0:
                    dot_alpha = max(0.0, min(1.0, (dot_radius - dot_d) + 0.5))
                    pix_r = int(pix_r * (1 - dot_alpha) + dot_color[0] * dot_alpha)
                    pix_g = int(pix_g * (1 - dot_alpha) + dot_color[1] * dot_alpha)
                    pix_b = int(pix_b * (1 - dot_alpha) + dot_color[2] * dot_alpha)
            
            buf[idx] = max(0, min(255, int(pix_r)))
            buf[idx + 1] = max(0, min(255, int(pix_g)))
            buf[idx + 2] = max(0, min(255, int(pix_b)))
            buf[idx + 3] = max(0, min(255, int(pix_a * 255)))
    
    # Downsample from 2x (scale) to target size
    out_buf = bytearray(size * size * 4)
    for oy in range(size):
        for ox in range(size):
            out_idx = (oy * size + ox) * 4
            r_acc, g_acc, b_acc, a_acc = 0, 0, 0, 0
            for sy in range(scale):
                for sx in range(scale):
                    in_idx = ((oy * scale + sy) * w + (ox * scale + sx)) * 4
                    r_acc += buf[in_idx]
                    g_acc += buf[in_idx + 1]
                    b_acc += buf[in_idx + 2]
                    a_acc += buf[in_idx + 3]
            count = scale * scale
            out_buf[out_idx] = r_acc // count
            out_buf[out_idx + 1] = g_acc // count
            out_buf[out_idx + 2] = b_acc // count
            out_buf[out_idx + 3] = a_acc // count
            
    return make_png(size, size, out_buf)

def main():
    os.makedirs('icons', exist_ok=True)
    sizes = [16, 32, 48, 128]
    for s in sizes:
        png_data = render_icon(s)
        path = f'icons/icon-{s}.png'
        with open(path, 'wb') as f:
            f.write(png_data)
        print(f'Generated {path} ({s}x{s}, {len(png_data)} bytes)')

if __name__ == '__main__':
    main()
