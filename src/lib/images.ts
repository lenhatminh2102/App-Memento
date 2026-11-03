import * as ImagePicker from 'expo-image-picker';
import { File } from 'expo-file-system';
import { supabase } from './supabase';

export async function pickAndUpload(userId: string, bucket = 'avatars', camera = false) {
  const permission = camera
    ? await ImagePicker.requestCameraPermissionsAsync()
    : await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!permission.granted)
    throw new Error('Vui lòng cấp quyền truy cập ảnh trong cài đặt điện thoại.');
  const options: ImagePicker.ImagePickerOptions = {
    mediaTypes: ['images'],
    quality: 0.8,
    allowsEditing: true,
  };
  const result = camera
    ? await ImagePicker.launchCameraAsync(options)
    : await ImagePicker.launchImageLibraryAsync(options);
  if (result.canceled) return null;
  const asset = result.assets[0];
  const type = asset.mimeType || 'image/jpeg';
  const ext = type.split('/')[1] || 'jpg';
  const path = `${userId}/${Date.now()}.${ext}`;
  const bytes = await new File(asset.uri).arrayBuffer();
  const { error } = await supabase.storage.from(bucket).upload(path, bytes, { contentType: type });
  if (error) throw error;
  return supabase.storage.from(bucket).getPublicUrl(path).data.publicUrl;
}
