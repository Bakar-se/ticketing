import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Button,
  FlatList,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { api } from "../../lib/api";
import { authClient } from "../../lib/auth-client";

type Project = { id: string; key: string; name: string };

function SignIn() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit() {
    setBusy(true);
    setError("");
    const res = await authClient.signIn.email({ email, password });
    if (res.error) setError(res.error.message ?? "Sign in failed");
    setBusy(false);
  }

  return (
    <View style={styles.form}>
      <Text style={styles.title}>Sign in</Text>
      <TextInput
        style={styles.input}
        placeholder="Email"
        autoCapitalize="none"
        keyboardType="email-address"
        value={email}
        onChangeText={setEmail}
      />
      <TextInput
        style={styles.input}
        placeholder="Password"
        secureTextEntry
        value={password}
        onChangeText={setPassword}
      />
      {error ? <Text style={styles.error}>{error}</Text> : null}
      <Button
        title={busy ? "Signing in…" : "Sign in"}
        onPress={submit}
        disabled={busy}
      />
    </View>
  );
}

function Projects({ email }: { email: string }) {
  const [projects, setProjects] = useState<Project[]>([]);
  const [error, setError] = useState("");

  useEffect(() => {
    api<Project[]>("/projects")
      .then(setProjects)
      .catch((e) => setError(e.message));
  }, []);

  return (
    <View style={styles.form}>
      <Text style={styles.title}>Projects</Text>
      <Text>Signed in as {email}</Text>
      {error ? <Text style={styles.error}>{error}</Text> : null}
      <FlatList
        data={projects}
        keyExtractor={(p) => p.id}
        renderItem={({ item }) => (
          <Text style={styles.row}>
            {item.key} · {item.name}
          </Text>
        )}
      />
      <Button title="Sign out" onPress={() => authClient.signOut()} />
    </View>
  );
}

export default function Home() {
  const { data: session, isPending } = authClient.useSession();
  if (isPending) return <ActivityIndicator style={{ flex: 1 }} />;
  return (
    <SafeAreaView style={styles.container}>
      {session ? <Projects email={session.user.email} /> : <SignIn />}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16 },
  form: { flex: 1, gap: 12 },
  title: { fontSize: 24, fontWeight: "600" },
  input: { borderWidth: 1, borderColor: "#ccc", borderRadius: 8, padding: 10 },
  error: { color: "crimson" },
  row: { paddingVertical: 8, fontSize: 16 },
});
