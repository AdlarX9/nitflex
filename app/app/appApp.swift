import SwiftUI

@main
struct NitflexApp: App {
    var body: some Scene {
        WindowGroup {
            NavigationStack {
                HomeView(viewModel: HomeViewModel())
                    .navigationTitle("Page d'accueil")
            }
        }
    }
}
