package in.savesmart.app.data

import com.google.firebase.Timestamp
import com.google.firebase.auth.FirebaseAuth
import com.google.firebase.firestore.FieldValue
import com.google.firebase.firestore.FirebaseFirestore
import com.google.firebase.firestore.FirebaseFirestoreSettings
import com.google.firebase.firestore.PersistentCacheSettings
import kotlinx.coroutines.channels.awaitClose
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.callbackFlow
import kotlinx.coroutines.tasks.await
import java.text.NumberFormat
import java.util.Locale

data class ExpenseItem(
    val id: String = "",
    val uid: String = "",
    val amount: Double = 0.0,
    val category: String = "Food",
    val description: String = "",
    val date: String = "",
    val paymentMethod: String = ""
)

data class IncomeItem(
    val id: String = "",
    val uid: String = "",
    val amount: Double = 0.0,
    val category: String = "Salary",
    val description: String = "",
    val date: String = ""
)

data class GoalItem(
    val id: String = "",
    val uid: String = "",
    val name: String = "",
    val targetAmount: Double = 0.0,
    val currentAmount: Double = 0.0,
    val targetDate: String = "",
    val status: String = "active"
)

data class BudgetItem(
    val id: String = "",
    val uid: String = "",
    val monthKey: String = "",
    val category: String = "Overall",
    val limitAmount: Double = 0.0
)

fun formatInr(amount: Double): String {
    val formatter = NumberFormat.getCurrencyInstance(Locale("en", "IN"))
    return formatter.format(amount)
}

class SaveSmartRepository {
    val auth: FirebaseAuth = FirebaseAuth.getInstance()

    // Connects to the exact same named Firestore database as the SaveSmart Web App
    val db: FirebaseFirestore = FirebaseFirestore.getInstance(
        "ai-studio-9b77afd0-b35e-4b29-890a-328841dbecb6"
    ).apply {
        firestoreSettings = FirebaseFirestoreSettings.Builder()
            .setLocalCacheSettings(PersistentCacheSettings.newBuilder().build())
            .build()
    }

    fun observeExpenses(uid: String): Flow<List<ExpenseItem>> = callbackFlow {
        val reg = db.collection("users").document(uid).collection("expenses")
            .whereEqualTo("uid", uid)
            .addSnapshotListener { snap, err ->
                if (err != null) return@addSnapshotListener
                val items = snap?.documents?.mapNotNull { it.toObject(ExpenseItem::class.java) } ?: emptyList()
                trySend(items.sortedByDescending { it.date })
            }
        awaitClose { reg.remove() }
    }

    fun observeIncome(uid: String): Flow<List<IncomeItem>> = callbackFlow {
        val reg = db.collection("users").document(uid).collection("income")
            .whereEqualTo("uid", uid)
            .addSnapshotListener { snap, err ->
                if (err != null) return@addSnapshotListener
                val items = snap?.documents?.mapNotNull { it.toObject(IncomeItem::class.java) } ?: emptyList()
                trySend(items.sortedByDescending { it.date })
            }
        awaitClose { reg.remove() }
    }

    fun observeGoals(uid: String): Flow<List<GoalItem>> = callbackFlow {
        val reg = db.collection("users").document(uid).collection("goals")
            .whereEqualTo("uid", uid)
            .addSnapshotListener { snap, err ->
                if (err != null) return@addSnapshotListener
                val items = snap?.documents?.mapNotNull { it.toObject(GoalItem::class.java) } ?: emptyList()
                trySend(items)
            }
        awaitClose { reg.remove() }
    }

    suspend fun addExpense(
        uid: String,
        amount: Double,
        category: String,
        description: String,
        date: String,
        paymentMethod: String = "UPI"
    ) {
        val col = db.collection("users").document(uid).collection("expenses")
        val docRef = col.document()
        val payload = hashMapOf(
            "id" to docRef.id,
            "uid" to uid,
            "amount" to amount,
            "category" to category,
            "description" to description.take(200),
            "date" to date,
            "paymentMethod" to paymentMethod,
            "createdAt" to FieldValue.serverTimestamp(),
            "updatedAt" to FieldValue.serverTimestamp()
        )
        docRef.set(payload).await()
    }

    suspend fun contributeToGoal(uid: String, goal: GoalItem, deposit: Double) {
        val nextAmount = goal.currentAmount + deposit
        val nextStatus = if (nextAmount >= goal.targetAmount) "completed" else "active"
        db.collection("users").document(uid).collection("goals").document(goal.id)
            .update(
                mapOf(
                    "currentAmount" to nextAmount,
                    "status" to nextStatus,
                    "updatedAt" to FieldValue.serverTimestamp()
                )
            ).await()
    }
}
