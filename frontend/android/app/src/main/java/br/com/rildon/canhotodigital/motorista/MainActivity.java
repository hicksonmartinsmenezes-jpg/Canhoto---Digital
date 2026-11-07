package br.com.rildon.canhotodigital.motorista;

import android.Manifest;
import android.content.pm.PackageManager;
import android.os.Build;
import android.os.Bundle;
import android.util.Log;
import android.webkit.WebView;
import androidx.core.app.ActivityCompat;
import androidx.core.content.ContextCompat;
import com.getcapacitor.Bridge;
import com.getcapacitor.BridgeActivity;
import java.lang.reflect.Method;
import java.util.Arrays;
import java.util.HashSet;
import java.util.Set;

public class MainActivity extends BridgeActivity {

    private static final String TAG = "CanhotoMotorista";

    // Páginas do servidor da loja que podem usar os recursos nativos: túnel
    // atual e VPS. Deve cobrir os mesmos domínios de "allowNavigation" em
    // capacitor.config.ts e de HOST_PERMITIDO em capacitor-www/index.html.
    private static final Set<String> ORIGENS_DO_SERVIDOR = new HashSet<>(
        Arrays.asList("https://*.trycloudflare.com", "https://entregas.rildoneletro.tech")
    );

    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        // Android 13+: pede permissão para mostrar a notificação fixa do
        // rastreamento de localização (aviso de "localização em uso").
        if (
            Build.VERSION.SDK_INT >= 33 &&
            ContextCompat.checkSelfPermission(this, Manifest.permission.POST_NOTIFICATIONS) != PackageManager.PERMISSION_GRANTED
        ) {
            ActivityCompat.requestPermissions(this, new String[] { Manifest.permission.POST_NOTIFICATIONS }, 1001);
        }

        ligarPonteNasPaginasDoServidor();
    }

    /**
     * O Capacitor só injeta a ponte com o Android (window.Capacitor) na página
     * local do app. Como o app abre a página do servidor da loja (túnel),
     * sem isso a página não enxerga o app nativo e as notificações, a
     * permissão e o aviso de "pronto para uso offline" não funcionam.
     * Aqui o mesmo script de ponte é registrado também para esse domínio.
     */
    private void ligarPonteNasPaginasDoServidor() {
        try {
            Class<?> recurso = Class.forName("androidx.webkit.WebViewFeature");
            boolean suportado = (Boolean) recurso.getMethod("isFeatureSupported", String.class).invoke(null, "DOCUMENT_START_SCRIPT");
            if (!suportado) {
                Log.w(TAG, "WebView sem suporte a script no início da página; ponte só na tela local.");
                return;
            }

            Bridge bridge = getBridge();
            Method obterInjetor = Bridge.class.getDeclaredMethod("getJSInjector");
            obterInjetor.setAccessible(true);
            Object injetor = obterInjetor.invoke(bridge);
            if (injetor == null) return;

            Method obterScript = injetor.getClass().getDeclaredMethod("getScriptString");
            obterScript.setAccessible(true);
            String script = (String) obterScript.invoke(injetor);

            Class<?> compat = Class.forName("androidx.webkit.WebViewCompat");
            compat
                .getMethod("addDocumentStartJavaScript", WebView.class, String.class, Set.class)
                .invoke(null, bridge.getWebView(), script, ORIGENS_DO_SERVIDOR);
        } catch (Throwable erro) {
            Log.w(TAG, "Não foi possível ligar a ponte nas páginas do servidor", erro);
        }
    }
}
