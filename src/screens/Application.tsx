import { useEffect, useState } from 'react';
import { Alert, Switch, Text, View } from 'react-native';
import { supabase } from '../lib/supabase';
import { pickAndUpload } from '../lib/images';
import type { Photographer } from '../types';
import {
  Body,
  Button,
  Card,
  ErrorText,
  Field,
  Loading,
  Page,
  Picture,
  Title,
  check,
  s,
} from '../ui';

type Form = {
  full_name: string;
  birth_date: string;
  phone: string;
  bank_code: string;
  bank_name: string;
  bank_account: string;
  bank_account_name: string;
  equipment: string;
  experience_years: string;
  experience_detail: string;
  bio: string;
  style_description: string;
  proof_link: string;
  work_model: string;
  cccd_front_url: string;
  cccd_back_url: string;
  banner_url: string;
  avatar_url: string;
};
const empty: Form = {
  full_name: '',
  birth_date: '',
  phone: '',
  bank_code: '',
  bank_name: '',
  bank_account: '',
  bank_account_name: '',
  equipment: '',
  experience_years: '',
  experience_detail: '',
  bio: '',
  style_description: '',
  proof_link: '',
  work_model: 'solo',
  cccd_front_url: '',
  cccd_back_url: '',
  banner_url: '',
  avatar_url: '',
};
const fields: [keyof Form, string][] = [
  ['full_name', 'Họ tên'],
  ['birth_date', 'Ngày sinh (YYYY-MM-DD)'],
  ['phone', 'Số điện thoại'],
  ['bank_code', 'Mã ngân hàng'],
  ['bank_name', 'Tên ngân hàng'],
  ['bank_account', 'Số tài khoản'],
  ['bank_account_name', 'Tên chủ tài khoản'],
  ['equipment', 'Thiết bị'],
  ['experience_years', 'Số năm kinh nghiệm'],
  ['experience_detail', 'Kinh nghiệm làm việc'],
  ['bio', 'Giới thiệu'],
  ['style_description', 'Phong cách chụp'],
  ['proof_link', 'Link hồ sơ / portfolio'],
  ['work_model', 'Mô hình làm việc (solo / team)'],
];
export default function Application({ userId }: { userId: string }) {
  const [form, setForm] = useState<Form>(empty);
  const [locations, setLocations] = useState('');
  const [styles, setStyles] = useState('');
  const [languages, setLanguages] = useState('Tiếng Việt');
  const [pins, setPins] = useState<string[]>([]);
  const [boards, setBoards] = useState<Photographer['boards']>([]);
  const [prices, setPrices] = useState<NonNullable<Photographer['price_groups']>>([]);
  const [status, setStatus] = useState('draft');
  const [agreed, setAgreed] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    void supabase
      .from('photographer_applications')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle()
      .then(({ data, error }) => {
        if (error) setError(error.message);
        if (data) {
          setForm(
            Object.fromEntries(
              Object.keys(empty).map((k) => [k, data[k] ?? empty[k as keyof Form]]),
            ) as Form,
          );
          setLocations((data.work_locations || []).join(', '));
          setStyles((data.selected_styles || []).join(', '));
          setLanguages((data.languages || []).join(', '));
          setPins(data.standalone_pins || []);
          setBoards(data.boards || []);
          setPrices(data.price_groups || []);
          setStatus(data.status);
          setAgreed(!!data.agreed_terms);
        }
        setLoading(false);
      });
  }, [userId]);
  const split = (value: string) =>
    value
      .split(',')
      .map((x) => x.trim())
      .filter(Boolean);
  async function save(submit: boolean) {
    if (
      submit &&
      (!form.full_name.trim() ||
        !form.phone.trim() ||
        !form.cccd_front_url ||
        !form.cccd_back_url ||
        !form.bank_account ||
        !form.bank_code ||
        !form.bio.trim() ||
        !locations.trim() ||
        !agreed ||
        !prices.length ||
        (!pins.length && !boards.length))
    )
      throw new Error(
        'Nhập đủ thông tin cá nhân, giấy tờ, ngân hàng, giới thiệu, địa điểm, ảnh portfolio, bảng giá và đồng ý điều khoản.',
      );
    const patch = {
      ...form,
      birth_date: form.birth_date || null,
      work_locations: split(locations),
      selected_styles: split(styles),
      languages: split(languages),
      standalone_pins: pins,
      boards,
      price_groups: prices,
      agreed_terms: agreed,
    };
    if (status === 'approved') {
      const { error } = await supabase.rpc('update_my_ptg_profile', { p_patch: patch });
      check(error?.message);
    } else {
      const next = submit ? 'submitted' : 'draft';
      const { error } = await supabase.from('photographer_applications').upsert(
        {
          ...patch,
          user_id: userId,
          status: next,
          ...(submit ? { submitted_at: new Date().toISOString() } : {}),
        },
        { onConflict: 'user_id' },
      );
      check(error?.message);
      setStatus(next);
    }
    Alert.alert(submit ? 'Đã gửi hồ sơ' : 'Đã lưu hồ sơ');
  }
  if (loading) return <Loading />;
  return (
    <Page>
      <Title>Hồ sơ nhiếp ảnh gia</Title>
      <Body>Trạng thái: {status}</Body>
      <ErrorText error={error} />
      {fields.map(([key, label]) => (
        <Field
          key={key}
          label={label}
          value={form[key]}
          onChangeText={(text) => setForm((current) => ({ ...current, [key]: text }))}
          multiline={['bio', 'experience_detail', 'style_description'].includes(key)}
        />
      ))}
      <Field
        label="Địa điểm làm việc, ngăn cách dấu phẩy"
        value={locations}
        onChangeText={setLocations}
      />
      <Field label="Thể loại chụp, ngăn cách dấu phẩy" value={styles} onChangeText={setStyles} />
      <Field label="Ngôn ngữ, ngăn cách dấu phẩy" value={languages} onChangeText={setLanguages} />
      {(
        [
          ['cccd_front_url', 'Mặt trước CCCD'],
          ['cccd_back_url', 'Mặt sau CCCD'],
          ['banner_url', 'Ảnh bìa'],
          ['avatar_url', 'Ảnh đại diện'],
        ] as const
      ).map(([key, label]) => (
        <Card key={key}>
          <Text style={s.heading}>{label}</Text>
          {!!form[key] && <Picture uri={form[key]} />}
          <Button
            secondary
            title={`Chọn ${label.toLowerCase()}`}
            onPress={async () => {
              const uri = await pickAndUpload(userId, 'photographer-applications');
              if (uri) setForm((current) => ({ ...current, [key]: uri }));
            }}
          />
        </Card>
      ))}
      <Text style={s.heading}>Ảnh portfolio</Text>
      {pins.map((uri, i) => (
        <Card key={`${uri}-${i}`}>
          <Picture uri={uri} />
          <Button
            secondary
            title="Bỏ ảnh"
            onPress={() => setPins((current) => current.filter((_, index) => index !== i))}
          />
        </Card>
      ))}
      <Button
        secondary
        title="Thêm ảnh portfolio"
        onPress={async () => {
          const uri = await pickAndUpload(userId, 'photographer-applications');
          if (uri) setPins((current) => [...current, uri]);
        }}
      />
      <Text style={s.heading}>Bộ sưu tập</Text>
      {boards.map((board, i) => (
        <Card key={board.id}>
          <Field
            label="Tên bộ ảnh"
            value={board.name}
            onChangeText={(name) =>
              setBoards((current) => current.map((b, index) => (index === i ? { ...b, name } : b)))
            }
          />
          {board.pins.map((uri, j) => (
            <Picture key={j} uri={uri} />
          ))}
          <Button
            secondary
            title="Thêm ảnh vào bộ"
            onPress={async () => {
              const uri = await pickAndUpload(userId, 'photographer-applications');
              if (uri)
                setBoards((current) =>
                  current.map((b, index) =>
                    index === i ? { ...b, cover: b.cover || uri, pins: [...b.pins, uri] } : b,
                  ),
                );
            }}
          />
          <Button
            secondary
            title="Xóa bộ ảnh"
            onPress={() => setBoards((current) => current.filter((_, index) => index !== i))}
          />
        </Card>
      ))}
      <Button
        secondary
        title="Tạo bộ ảnh"
        onPress={() =>
          setBoards((current) => [
            ...current,
            { id: String(Date.now()), name: 'Bộ ảnh mới', private: false, cover: '', pins: [] },
          ])
        }
      />
      <Text style={s.heading}>Bảng giá</Text>
      {prices.map((group, i) => (
        <Card key={group.id}>
          <Field
            label="Tên nhóm dịch vụ"
            value={group.title}
            onChangeText={(title) =>
              setPrices((current) => current.map((g, index) => (index === i ? { ...g, title } : g)))
            }
          />
          <Field
            label="Loại (photo / makeup / editor / rental)"
            value={group.category}
            onChangeText={(category) =>
              setPrices((current) =>
                current.map((g, index) => (index === i ? { ...g, category } : g)),
              )
            }
          />
          {group.lines.map((line, j) => (
            <Card key={line.id}>
              {(['name', 'price', 'detail'] as const).map((key) => (
                <Field
                  key={key}
                  label={{ name: 'Tên gói', price: 'Giá (đ)', detail: 'Chi tiết' }[key]}
                  value={line[key]}
                  keyboardType={key === 'price' ? 'numeric' : 'default'}
                  onChangeText={(text) =>
                    setPrices((current) =>
                      current.map((g, index) =>
                        index === i
                          ? {
                              ...g,
                              lines: g.lines.map((l, k) => (k === j ? { ...l, [key]: text } : l)),
                            }
                          : g,
                      ),
                    )
                  }
                />
              ))}
            </Card>
          ))}
          <Button
            secondary
            title="Thêm gói"
            onPress={() =>
              setPrices((current) =>
                current.map((g, index) =>
                  index === i
                    ? {
                        ...g,
                        lines: [
                          ...g.lines,
                          { id: String(Date.now()), name: '', price: '', detail: '' },
                        ],
                      }
                    : g,
                ),
              )
            }
          />
        </Card>
      ))}
      <Button
        secondary
        title="Thêm nhóm giá"
        onPress={() =>
          setPrices((current) => [
            ...current,
            {
              id: String(Date.now()),
              title: 'Chụp ảnh',
              category: 'photo',
              lines: [{ id: String(Date.now()), name: '', price: '', detail: '' }],
            },
          ])
        }
      />
      <View style={s.row}>
        <Switch value={agreed} onValueChange={setAgreed} />
        <Body>Tôi đồng ý điều khoản đăng ký.</Body>
      </View>
      <Button secondary title="Lưu hồ sơ" onPress={() => save(false)} />
      {status !== 'approved' && <Button title="Gửi hồ sơ xét duyệt" onPress={() => save(true)} />}
    </Page>
  );
}
