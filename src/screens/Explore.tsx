import React, { useEffect, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { usePhotographers } from '../hooks/usePhotographers';
import type { Photographer } from '../types';
import { fetchPins, setPinned, fetchReviews, submitReview, type ReviewRow } from '../lib/social';
import { formatVnd, buildServiceOptions } from '../lib/bookings';
import { Body, Button, Card, ErrorText, Field, Loading, Page, Picture, Title, check, s } from '../ui';

export function Explore({ home, open, requests }: { home: boolean; open: (p: Photographer) => void; requests: () => void }) {
  const { photographers, loading, error, refresh } = usePhotographers();
  const [query, setQuery] = useState(''); const [location, setLocation] = useState(''); const [budget, setBudget] = useState(''); const [savedOnly, setSavedOnly] = useState(false); const [pins, setPins] = useState<number[]>([]);
  useEffect(() => { void fetchPins().then(setPins); }, []);
  const list = photographers.filter(p => `${p.name} ${p.specialty} ${(p.tags ?? []).join(' ')}`.toLocaleLowerCase('vi').includes(query.toLocaleLowerCase('vi')) && (!location || p.location?.toLowerCase().includes(location.toLowerCase())) && (!budget || p.price <= Number(budget)) && (!savedOnly || pins.includes(p.id)));
  return <Page>{home ? <View style={s.hero}><Text style={[s.heading, { color: 'white' }]}>Memento</Text><Text style={[s.title, { color: 'white' }]}>Tìm nhiếp ảnh gia{ '\n' }hoàn hảo cho bạn</Text><Text style={[s.text, { color: '#BEE9DD' }]}>Kết nối cảm xúc qua từng khoảnh khắc</Text></View> : <Title>Khám phá</Title>}
    <Field label="Tìm nhiếp ảnh gia" value={query} onChangeText={setQuery} placeholder="Tên, phong cách chụp..." />
    {!home && <><Field label="Địa điểm" value={location} onChangeText={setLocation} /><Field label="Ngân sách tối đa (đ)" value={budget} onChangeText={setBudget} keyboardType="numeric" /><Button secondary title={savedOnly ? 'Hiển thị tất cả' : 'Xem hồ sơ đã ghim'} onPress={() => setSavedOnly(!savedOnly)} /></>}
    {home && <Card><Text style={s.heading}>MEMENTO CHOICE</Text><Body>Bắt đầu hành trình của bạn với nhiếp ảnh gia phù hợp.</Body><Button title="Bảng tin tìm nhiếp ảnh gia" onPress={requests} /></Card>}
    <Text style={s.heading}>Nhiếp ảnh gia {home ? 'nổi bật' : ''}</Text><ErrorText error={error} />{loading && <Loading />}
    {!loading && !list.length && <Body muted>Chưa tìm thấy nhiếp ảnh gia phù hợp.</Body>}
    {list.map(p => <Card key={p.id}><Pressable accessibilityRole="button" onPress={() => open(p)}><Picture uri={p.cover || p.avatar} /><View style={{ paddingTop: 12, gap: 6 }}><Text style={s.heading}>{p.name}</Text><Body muted>{p.location} · ★ {p.rating || 0}</Body><Body>{p.specialty}</Body><Text style={s.heading}>{formatVnd(p.price)}</Text></View></Pressable><Button secondary title={pins.includes(p.id) ? 'Đã ghim ♥' : 'Ghim hồ sơ ♡'} onPress={async () => { const yes = !pins.includes(p.id); check(await setPinned(p.id, yes)); setPins(current => yes ? [...current, p.id] : current.filter(id => id !== p.id)); }} /></Card>)}
    <Button secondary title="Tải lại" onPress={refresh} />
  </Page>;
}
export function PhotographerDetail({ photographer: p, book }: { photographer: Photographer; book: () => void }) {
  const [reviews, setReviews] = useState<ReviewRow[]>([]); const [rating, setRating] = useState('5'); const [comment, setComment] = useState('');
  const load = () => fetchReviews(p.id, 100).then(setReviews);
  useEffect(() => { void load(); }, [p.id]);
  const pictures = [...new Set([...(p.portfolio ?? []), ...(p.standalone_pins ?? []), ...(p.boards ?? []).filter(b => !b.private).flatMap(b => b.pins)])];
  return <Page><Picture uri={p.cover || p.avatar} /><Title>{p.name}</Title><Body muted>{p.location} · ★ {p.rating} · {p.review_count ?? reviews.length} đánh giá</Body><Body>{p.bio}</Body><Body>{p.specialty}</Body><Button title="Đặt lịch chụp" onPress={book} />
    <Text style={s.heading}>Bảng giá dịch vụ</Text>{buildServiceOptions(p).map(option => <Card key={option.id}><Text style={s.heading}>{option.name}</Text><Body>{option.detail}</Body><Body>{formatVnd(option.price)}</Body></Card>)}
    <Text style={s.heading}>Bộ ảnh</Text>{pictures.map((uri, i) => <Picture key={`${uri}-${i}`} uri={uri} />)}
    <Text style={s.heading}>Đánh giá</Text>{reviews.map(r => <Card key={r.id}><Body>{r.reviewer_name} · {'★'.repeat(r.rating)}</Body><Body>{r.comment}</Body></Card>)}
    <Card><Field label="Số sao (1–5)" value={rating} onChangeText={setRating} keyboardType="number-pad" /><Field label="Nhận xét" value={comment} onChangeText={setComment} multiline /><Button title="Gửi đánh giá" onPress={async () => { const n = Number(rating); if (!Number.isInteger(n) || n < 1 || n > 5 || !comment.trim()) throw new Error('Nhập số sao từ 1 đến 5 và nội dung nhận xét.'); check(await submitReview(p.id, n, comment.trim())); setComment(''); await load(); }} /></Card>
  </Page>;
}
