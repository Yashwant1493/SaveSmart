package in.savesmart.app.ui.theme

import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.lightColorScheme
import androidx.compose.runtime.Composable
import androidx.compose.ui.graphics.Color

val NavyPrimary = Color(0xFF101B35)
val NavySecondary = Color(0xFF182746)
val EmeraldGreen = Color(0xFF10B981)
val LightGreen = Color(0xFFD1FAE5)
val SurfaceWhite = Color(0xFFFFFFFF)
val CanvasBackground = Color(0xFFF5F7FA)
val InkText = Color(0xFF182230)

private val SaveSmartColorScheme = lightColorScheme(
    primary = NavyPrimary,
    secondary = EmeraldGreen,
    tertiary = NavySecondary,
    background = CanvasBackground,
    surface = SurfaceWhite,
    onPrimary = SurfaceWhite,
    onSecondary = NavyPrimary,
    onBackground = InkText,
    onSurface = InkText,
    primaryContainer = LightGreen,
    onPrimaryContainer = NavyPrimary
)

@Composable
fun SaveSmartTheme(content: @Composable () -> Unit) {
    MaterialTheme(
        colorScheme = SaveSmartColorScheme,
        content = content
    )
}
