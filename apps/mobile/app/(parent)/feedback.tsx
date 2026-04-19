import { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Alert,
  ScrollView,
  ActivityIndicator,
} from "react-native";
import { supabase } from "../../lib/supabase";

export default function ParentFeedback() {
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit() {
    if (!subject.trim() || !message.trim()) {
      Alert.alert("Validation", "Please fill in both Subject and Message.");
      return;
    }

    setSubmitting(true);
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        Alert.alert("Error", "Not logged in.");
        return;
      }

      const { data: sp } = await supabase
        .from("student_profiles")
        .select("school_id")
        .eq("profile_id", user.id)
        .single();

      const { error } = await supabase.from("feedback").insert({
        from_user_id: user.id,
        to_role: "teacher",
        school_id: sp?.school_id ?? null,
        subject: subject.trim(),
        message: message.trim(),
      });

      if (error) {
        Alert.alert("Error", error.message);
        return;
      }

      Alert.alert("Success", "Your feedback has been submitted.");
      setSubject("");
      setMessage("");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <ScrollView
      className="flex-1 bg-gray-50 p-5"
      keyboardShouldPersistTaps="handled"
    >
      <Text className="mt-12 mb-6 text-2xl font-bold text-gray-900">
        Send Feedback
      </Text>

      <Text className="mb-1 text-sm font-medium text-gray-700">Subject</Text>
      <TextInput
        className="mb-4 rounded-xl border border-gray-200 bg-white px-4 py-3 text-gray-900"
        placeholder="e.g. Question about homework"
        placeholderTextColor="#9ca3af"
        value={subject}
        onChangeText={setSubject}
        returnKeyType="next"
      />

      <Text className="mb-1 text-sm font-medium text-gray-700">Message</Text>
      <TextInput
        className="mb-6 rounded-xl border border-gray-200 bg-white px-4 py-3 text-gray-900"
        placeholder="Write your message here…"
        placeholderTextColor="#9ca3af"
        value={message}
        onChangeText={setMessage}
        multiline
        numberOfLines={5}
        textAlignVertical="top"
        style={{ minHeight: 120 }}
      />

      <TouchableOpacity
        onPress={handleSubmit}
        disabled={submitting}
        className="rounded-xl bg-blue-600 py-3.5 disabled:opacity-50"
      >
        {submitting ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text className="text-center text-base font-semibold text-white">
            Submit Feedback
          </Text>
        )}
      </TouchableOpacity>
    </ScrollView>
  );
}
