package in.savesmart.app

import android.content.Intent
import android.net.Uri
import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.core.splashscreen.SplashScreen.Companion.installSplashScreen
import com.google.firebase.auth.FirebaseUser
import in.savesmart.app.data.SaveSmartRepository
import in.savesmart.app.data.formatInr
import in.savesmart.app.ui.theme.EmeraldGreen
import in.savesmart.app.ui.theme.NavyPrimary
import in.savesmart.app.ui.theme.SaveSmartTheme
import kotlinx.coroutines.launch

class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        installSplashScreen()
        super.onCreate(savedInstanceState)
        val repo = SaveSmartRepository()
        setContent {
            SaveSmartTheme {
                SaveSmartAndroidApp(repo = repo)
            }
        }
    }
}

enum class BottomTab(val label: String) {
    Home("Home"),
    Expenses("Expenses"),
    Goals("Goals"),
    Analytics("Analytics"),
    Profile("Profile")
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun SaveSmartAndroidApp(repo: SaveSmartRepository) {
    var currentUser by remember { mutableStateOf<FirebaseUser?>(repo.auth.currentUser) }
    var activeTab by remember { mutableStateOf(BottomTab.Home) }
    var emailInput by remember { mutableStateOf("") }
    var passwordInput by remember { mutableStateOf("") }
    var authError by remember { mutableStateOf<String?>(null) }

    DisposableEffect(Unit) {
        val listener = com.google.firebase.auth.FirebaseAuth.AuthStateListener { auth ->
            currentUser = auth.currentUser
        }
        repo.auth.addAuthStateListener(listener)
        onDispose { repo.auth.removeAuthStateListener(listener) }
    }

    if (currentUser == null) {
        Scaffold { padding ->
            Column(
                modifier = Modifier
                    .fillMaxSize()
                    .padding(padding)
                    .padding(24.dp),
                verticalArrangement = Arrangement.Center,
                horizontalAlignment = Alignment.CenterHorizontally
            ) {
                Text(
                    text = "SaveSmart",
                    style = MaterialTheme.typography.headlineLarge,
                    fontWeight = FontWeight.Bold,
                    color = NavyPrimary
                )
                Text(
                    text = "Track Smart. Spend Better. Save More.",
                    style = MaterialTheme.typography.bodyMedium
                )
                Spacer(Modifier.height(24.dp))
                OutlinedTextField(
                    value = emailInput,
                    onValueChange = { emailInput = it },
                    label = { Text("Email") },
                    modifier = Modifier.fillMaxWidth()
                )
                Spacer(Modifier.height(12.dp))
                OutlinedTextField(
                    value = passwordInput,
                    onValueChange = { passwordInput = it },
                    label = { Text("Password") },
                    modifier = Modifier.fillMaxWidth()
                )
                authError?.let {
                    Spacer(Modifier.height(8.dp))
                    Text(it, color = MaterialTheme.colorScheme.error)
                }
                Spacer(Modifier.height(16.dp))
                Button(
                    onClick = {
                        repo.auth.signInWithEmailAndPassword(emailInput.trim(), passwordInput)
                            .addOnFailureListener { authError = it.localizedMessage }
                    },
                    modifier = Modifier.fillMaxWidth()
                ) {
                    Text("Sign In")
                }
            }
        }
        return
    }

    val uid = currentUser!!.uid
    val expenses by repo.observeExpenses(uid).collectAsState(initial = emptyList())
    val income by repo.observeIncome(uid).collectAsState(initial = emptyList())
    val goals by repo.observeGoals(uid).collectAsState(initial = emptyList())
    val scope = rememberCoroutineScope()
    val context = LocalContext.current

    val totalIncome = income.sumOf { it.amount }
    val totalExpenses = expenses.sumOf { it.amount }
    val balance = totalIncome - totalExpenses

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("SaveSmart", fontWeight = FontWeight.Bold) },
                actions = {
                    IconButton(onClick = {
                        val intent = Intent(
                            Intent.ACTION_VIEW,
                            Uri.parse("https://wa.me/919891357202?text=Hello%20SaveSmart%20Team%2C%20I%20need%20assistance%20with%20the%20SaveSmart%20application.")
                        )
                        context.startActivity(intent)
                    }) {
                        Icon(Icons.Default.SupportAgent, contentDescription = "WhatsApp Support")
                    }
                }
            )
        },
        bottomBar = {
            NavigationBar {
                BottomTab.entries.forEach { tab ->
                    NavigationBarItem(
                        selected = activeTab == tab,
                        onClick = { activeTab = tab },
                        icon = {
                            Icon(
                                when (tab) {
                                    BottomTab.Home -> Icons.Default.Home
                                    BottomTab.Expenses -> Icons.Default.Receipt
                                    BottomTab.Goals -> Icons.Default.Flag
                                    BottomTab.Analytics -> Icons.Default.BarChart
                                    BottomTab.Profile -> Icons.Default.Person
                                },
                                contentDescription = tab.label
                            )
                        },
                        label = { Text(tab.label) }
                    )
                }
            }
        }
    ) { padding ->
        when (activeTab) {
            BottomTab.Home -> {
                LazyColumn(
                    modifier = Modifier
                        .fillMaxSize()
                        .padding(padding)
                        .padding(16.dp),
                    verticalArrangement = Arrangement.spacedBy(12.dp)
                ) {
                    item {
                        Card(modifier = Modifier.fillMaxWidth()) {
                            Column(Modifier.padding(16.dp)) {
                                Text("Available Balance", style = MaterialTheme.typography.labelMedium)
                                Text(
                                    formatInr(balance),
                                    style = MaterialTheme.typography.headlineMedium,
                                    fontWeight = FontWeight.Bold,
                                    color = EmeraldGreen
                                )
                                Spacer(Modifier.height(8.dp))
                                Text("Income: ${formatInr(totalIncome)}  •  Expenses: ${formatInr(totalExpenses)}")
                            }
                        }
                    }
                    item {
                        Text("Recent Expenses", fontWeight = FontWeight.Bold)
                    }
                    items(expenses.take(5)) { exp ->
                        Card(modifier = Modifier.fillMaxWidth()) {
                            Row(
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .padding(14.dp),
                                horizontalArrangement = Arrangement.SpaceBetween
                            ) {
                                Column {
                                    Text(exp.description, fontWeight = FontWeight.SemiBold)
                                    Text("${exp.category} • ${exp.date}", style = MaterialTheme.typography.bodySmall)
                                }
                                Text(formatInr(exp.amount), fontWeight = FontWeight.Bold)
                            }
                        }
                    }
                }
            }

            BottomTab.Expenses -> {
                var desc by remember { mutableStateOf("") }
                var amt by remember { mutableStateOf("") }
                Column(
                    modifier = Modifier
                        .fillMaxSize()
                        .padding(padding)
                        .padding(16.dp),
                    verticalArrangement = Arrangement.spacedBy(12.dp)
                ) {
                    Text("Log INR Expense", fontWeight = FontWeight.Bold)
                    OutlinedTextField(value = desc, onValueChange = { desc = it }, label = { Text("Description") }, modifier = Modifier.fillMaxWidth())
                    OutlinedTextField(value = amt, onValueChange = { amt = it }, label = { Text("Amount (₹)") }, modifier = Modifier.fillMaxWidth())
                    Button(
                        onClick = {
                            val parsed = amt.toDoubleOrNull() ?: 0.0
                            if (parsed > 0 && desc.isNotBlank()) {
                                scope.launch {
                                    repo.addExpense(uid, parsed, "Food", desc, java.time.LocalDate.now().toString())
                                    desc = ""
                                    amt = ""
                                }
                            }
                        },
                        modifier = Modifier.fillMaxWidth()
                    ) { Text("Save Expense") }
                }
            }

            BottomTab.Goals -> {
                LazyColumn(
                    modifier = Modifier
                        .fillMaxSize()
                        .padding(padding)
                        .padding(16.dp),
                    verticalArrangement = Arrangement.spacedBy(12.dp)
                ) {
                    items(goals) { goal ->
                        val progress = if (goal.targetAmount > 0) (goal.currentAmount / goal.targetAmount).toFloat().coerceIn(0f, 1f) else 0f
                        Card(modifier = Modifier.fillMaxWidth()) {
                            Column(Modifier.padding(16.dp)) {
                                Text(goal.name, fontWeight = FontWeight.Bold)
                                Text("${formatInr(goal.currentAmount)} / ${formatInr(goal.targetAmount)}")
                                Spacer(Modifier.height(8.dp))
                                LinearProgressIndicator(progress = { progress }, modifier = Modifier.fillMaxWidth())
                            }
                        }
                    }
                }
            }

            BottomTab.Analytics -> {
                Column(
                    modifier = Modifier
                        .fillMaxSize()
                        .padding(padding)
                        .padding(16.dp)
                ) {
                    Text("Spending Analytics (INR)", fontWeight = FontWeight.Bold)
                    Spacer(Modifier.height(12.dp))
                    Text("Total Expenses: ${formatInr(totalExpenses)}")
                    Text("Total Income: ${formatInr(totalIncome)}")
                    Text("Active Savings Goals: ${goals.size}")
                }
            }

            BottomTab.Profile -> {
                Column(
                    modifier = Modifier
                        .fillMaxSize()
                        .padding(padding)
                        .padding(16.dp),
                    verticalArrangement = Arrangement.spacedBy(12.dp)
                ) {
                    Text("Account", fontWeight = FontWeight.Bold)
                    Text(currentUser?.email ?: "")
                    Button(onClick = { repo.auth.signOut() }) {
                        Text("Sign Out")
                    }
                }
            }
        }
    }
}
